import { useEffect, useMemo, useRef, useState } from "react";

import type { CharacterCardV2 } from "@/types/character";
import type { Lorebook } from "@/types/lorebook";
import type { WorldState } from "@/types/worldState";
import type { ChatMessage, StoryTurn } from "@/types/turn";

import { runLLM } from "@/lib/llm";
import { applyTurn } from "@/lib/worldState";
import { pushDate } from "@/lib/timeAdvance";
import { decideEvent } from "@/lib/eventTrigger";
import { type SummaryState, emptySummary, maybeUpdateSummary, tailHistory } from "@/lib/summary";
import { startingPointById } from "@/data/startingPoints";
import { renderTimelineContext } from "@/data/worldTimeline";
import { renderIdentityGuide } from "@/data/identityGuide";
import { rollEnding, generateEndingNarrative, type EndingTrigger } from "@/lib/ending";
import { save, load, clear, type SaveBlob } from "@/lib/storage";
import { loadSettings } from "@/lib/settings";
import { buildPromptForTurn } from "@/lib/prompting";
import type { PromptBuildTrace, PromptMode } from "@/lib/prompting/types";
import { parseSillyTavernPresetJson } from "@/lib/sillytavern/presetParser";
import {
  loadPromptMode,
  loadStoredSillyTavernPreset,
  type StoredSillyTavernPreset,
} from "@/lib/sillytavern/presetStorage";
import type { SillyTavernChatCompletionPreset } from "@/lib/sillytavern/presetTypes";

import { TopBar } from "./TopBar";
import { MessageStream } from "./MessageStream";
import { ChoicePanel } from "./ChoicePanel";
import { StatusPanel } from "./StatusPanel";
import { SettingsModal } from "./SettingsModal";
import { EndingScreen } from "./EndingScreen";

type Props = {
  card: CharacterCardV2;
  lorebook: Lorebook;
  initialState: WorldState;
  characterId: string;
  customCard?: CharacterCardV2;
  resumeFrom?: SaveBlob | null;
  onReset: () => void;
};

type TurnCheckpoint = {
  state: WorldState;
  history: ChatMessage[];
  summary: SummaryState;
  userInput: string;
};

export function StoryView({ card, lorebook, initialState, characterId, customCard, resumeFrom, onReset }: Props) {
  const [state, setState] = useState<WorldState>(resumeFrom?.state ?? initialState);
  const [history, setHistory] = useState<ChatMessage[]>(resumeFrom?.history ?? []);
  const [summary, setSummary] = useState<SummaryState>(resumeFrom?.summary ?? emptySummary);
  const [turns, setTurns] = useState<StoryTurn[]>(
    () => (resumeFrom?.history ?? []).flatMap((m) => (m.parsed ? [m.parsed] : [])),
  );
  const [turnCheckpoints, setTurnCheckpoints] = useState<TurnCheckpoint[]>(
    () => buildTurnCheckpoints(initialState, resumeFrom?.history ?? []),
  );
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [trace, setTrace] = useState<PromptBuildTrace | null>(null);
  const [promptRuntime, setPromptRuntime] = useState<PromptRuntime>(() => loadPromptRuntime());
  const [showSettings, setShowSettings] = useState(false);
  const [ending, setEnding] = useState<EndingTrigger | null>(null);
  const [endingText, setEndingText] = useState<string | null>(null);
  const [endingErr, setEndingErr] = useState<string | null>(null);

  const initRef = useRef(false);

  // 第一轮：自动用"故事开场"信号触发一次推进（仅在不是 resume 时）
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (!resumeFrom) {
      void advance("__story_open__");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastTurn = useMemo(() => turns[turns.length - 1], [turns]);

  async function advance(userInput: string) {
    await advanceFrom({
      userInput,
      baseState: state,
      baseHistory: history,
      baseSummary: summary,
    });
  }

  async function advanceFrom(opts: {
    userInput: string;
    baseState: WorldState;
    baseHistory: ChatMessage[];
    baseSummary: SummaryState;
  }) {
    const { userInput, baseState, baseHistory, baseSummary } = opts;
    setLoading(true);

    const decision = decideEvent(baseState);

    // 时间推进现在完全由 LLM 上一轮的 timeAdvance 决定——这一轮调用前不再预先推进
    let next = baseState;

    if (!next.activeChain && decision.proposedChain) {
      next = {
        ...next,
        activeChain: {
          id: decision.proposedChain.id,
          step: 1,
          totalSteps: decision.proposedChain.totalSteps,
        },
      };
    }

    const promptUser =
      userInput === "__story_open__"
        ? "（故事开始。请按 scenario 与世界书自然展开本轮事件，不要直接介绍角色。）"
        : userInput;

    // Rolling Summary：先把"已折叠"的尾部历史拿出来
    const visibleHistory = tailHistory(baseHistory, baseSummary);

    const sceneCast = startingPointById[next.startingPoint]?.sceneCast;
    const timelineContext = renderTimelineContext({
      currentIso: next.date.iso,
      identity: next.identity,
    });
    const identityGuide = renderIdentityGuide(next.identity);

    const built = buildPromptForTurn({
      mode: promptRuntime.mode,
      stPreset: promptRuntime.preset,
      stPresetName: promptRuntime.stored?.summary.name,
      card,
      lorebook,
      state: next,
      eventKind: decision.eventKind,
      history: visibleHistory,
      summary: baseSummary.text,
      userInput: promptUser,
      sceneCast,
      timelineContext,
      identityGuide,
    });
    setTrace(withRuntimeWarnings(built.trace, promptRuntime));

    const { raw, turn } = await runLLM({ messages: built.messages, sampling: built.sampling });

    const userMsg: ChatMessage = { role: "user", content: promptUser };
    const aiMsg: ChatMessage = { role: "assistant", content: raw, parsed: turn };
    const nextHistory = [...baseHistory, userMsg, aiMsg];

    // 时间推进——按 LLM 给的 timeAdvance 字段
    const advancedState: WorldState = {
      ...next,
      date: pushDate(next.date, turn.timeAdvance),
      flow: turn.pace === "scene" ? "chain" : "weekly",
    };
    const finalState = applyTurn(advancedState, turn);

    // 异步更新 Rolling Summary（不阻塞 UI）
    maybeUpdateSummary({ history: nextHistory, prev: baseSummary }).then(setSummary);

    setHistory(nextHistory);
    setTurns((prev) => [...prev, turn]);
    setTurnCheckpoints((prev) => [
      ...prev,
      { state: baseState, history: baseHistory, summary: baseSummary, userInput: promptUser },
    ]);
    setState(finalState);
    setLoading(false);
    setPending(null);

    // 终结判定
    const trigger = rollEnding(finalState);
    if (trigger) {
      void runEnding(trigger, finalState, nextHistory);
    }
  }

  function deleteLatestTurn() {
    if (loading || turns.length === 0) return;
    const checkpoint = turnCheckpoints[turnCheckpoints.length - 1];
    if (!checkpoint) return;
    setState(checkpoint.state);
    setHistory(checkpoint.history);
    setSummary(checkpoint.summary);
    setTurns((prev) => prev.slice(0, -1));
    setTurnCheckpoints((prev) => prev.slice(0, -1));
    setPending(null);
    setTrace(null);
  }

  function regenerateLatestTurn() {
    if (loading || turns.length === 0) return;
    const checkpoint = turnCheckpoints[turnCheckpoints.length - 1];
    if (!checkpoint) return;
    setState(checkpoint.state);
    setHistory(checkpoint.history);
    setSummary(checkpoint.summary);
    setTurns((prev) => prev.slice(0, -1));
    setTurnCheckpoints((prev) => prev.slice(0, -1));
    setPending(checkpoint.userInput);
    void advanceFrom({
      userInput: checkpoint.userInput,
      baseState: checkpoint.state,
      baseHistory: checkpoint.history,
      baseSummary: checkpoint.summary,
    });
  }

  function updateLatestTurn(updated: StoryTurn) {
    if (turns.length === 0) return;
    setTurns((prev) => [...prev.slice(0, -1), updated]);
    setHistory((prev) => replaceLastParsedAssistant(prev, updated));
  }

  async function runEnding(trigger: EndingTrigger, finalState: WorldState, nextHistory: ChatMessage[]) {
    setEnding(trigger);
    setEndingText(null);
    setEndingErr(null);
    try {
      const text = await generateEndingNarrative({
        state: finalState,
        history: nextHistory,
        ending: trigger,
        characterName: card.data.name,
        summary: summary.text,
      });
      setEndingText(text);
    } catch (e) {
      setEndingErr(e instanceof Error ? e.message : String(e));
      setEndingText("（结局生成失败，但故事并未中断——请检查 LLM 设置或选择「开始新的故事」。）");
    }
  }

  function onChoose(text: string) {
    if (loading) return;
    setPending(text);
    void advance(text);
  }

  function onContinue() {
    if (loading) return;
    setPending(null);
    const input = promptRuntime.mode === "sillytavern-preset"
      ? "（继续推进当前故事。）"
      : "（继续推进。请按当前节奏自然延续故事——日常段落用 summary 跳过 1-2 天，关键节点用 scene。）";
    void advance(input);
  }

  function doSave() {
    save({
      state, history, summary,
      characterId,
      customCard: customCard ?? null,
      savedAt: new Date().toISOString(),
    });
    alert("已保存到 localStorage。");
  }

  function doLoad() {
    const blob = load();
    if (!blob) { alert("没有找到存档。"); return; }
    setState(blob.state);
    setHistory(blob.history);
    setSummary(blob.summary ?? emptySummary);
    setTurns(blob.history.flatMap((m) => (m.parsed ? [m.parsed] : [])));
    setTurnCheckpoints(buildTurnCheckpoints(initialState, blob.history));
    alert("已载入存档。");
  }

  function doClear() {
    if (!confirm("确认清除当前存档？")) return;
    clear();
    alert("已清除。");
  }

  return (
    <div className="story-view">
      <TopBar
        title={`凉宫春日 · ${card.data.name}`}
        subtitle={state.date.display}
        onReset={onReset}
        actions={
          <>
            <button className="ghost-btn" onClick={doSave}>保存</button>
            <button className="ghost-btn" onClick={doLoad}>读取</button>
            <button className="ghost-btn" onClick={doClear}>清除</button>
            <button className="ghost-btn" onClick={() => setShowSettings(true)}>设置</button>
          </>
        }
      />

      <div className="story-body">
        <main className="story-main">
          <MessageStream
            turns={turns}
            pendingUserAction={pending}
            loading={loading}
            onDeleteLatest={deleteLatestTurn}
            onRegenerateLatest={regenerateLatestTurn}
            onUpdateLatest={updateLatestTurn}
          />
        </main>

        <StatusPanel state={state} characterName={card.data.name} trace={trace} summaryStatus={summary} />
      </div>

      <footer className="story-footer">
        <ChoicePanel
          choices={lastTurn?.choices ?? []}
          requiresChoice={lastTurn?.requiresChoice ?? false}
          disabled={loading}
          onChoose={onChoose}
          onContinue={onContinue}
        />
      </footer>

      {showSettings && (
        <SettingsModal
          initial={loadSettings()}
          onClose={() => {
            setPromptRuntime(loadPromptRuntime());
            setShowSettings(false);
          }}
        />
      )}

      {ending && (
        <EndingScreen
          ending={ending}
          characterName={card.data.name}
          text={endingText}
          error={endingErr}
          onRestart={onReset}
        />
      )}
    </div>
  );
}

type PromptRuntime = {
  mode: PromptMode;
  stored: StoredSillyTavernPreset | null;
  preset: SillyTavernChatCompletionPreset | null;
  warnings: string[];
};

function loadPromptRuntime(): PromptRuntime {
  const mode = loadPromptMode();
  const stored = loadStoredSillyTavernPreset();
  if (!stored) {
    return { mode, stored: null, preset: null, warnings: mode === "sillytavern-preset" ? ["已选择 ST 预设模式，但尚未导入 preset，当前轮次会回退 legacy。"] : [] };
  }

  try {
    const parsed = parseSillyTavernPresetJson(stored.raw, stored.summary.name);
    return {
      mode,
      stored,
      preset: parsed.preset,
      warnings: parsed.diagnostics,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      mode: "legacy",
      stored,
      preset: null,
      warnings: [`ST preset 解析失败，已回退 legacy：${msg}`],
    };
  }
}

function withRuntimeWarnings(trace: PromptBuildTrace, runtime: PromptRuntime): PromptBuildTrace {
  if (runtime.warnings.length === 0) return trace;
  return {
    ...trace,
    warnings: [...(trace.warnings ?? []), ...runtime.warnings],
  };
}

function replaceLastParsedAssistant(history: ChatMessage[], turn: StoryTurn): ChatMessage[] {
  const next = [...history];
  for (let i = next.length - 1; i >= 0; i -= 1) {
    const msg = next[i];
    if (msg.role === "assistant" && msg.parsed) {
      next[i] = {
        ...msg,
        parsed: turn,
        content: serializeTurn(turn),
      };
      break;
    }
  }
  return next;
}

function serializeTurn(turn: StoryTurn): string {
  return `<event_json>\n${JSON.stringify(turn, null, 2)}\n</event_json>`;
}

function buildTurnCheckpoints(initialState: WorldState, history: ChatMessage[]): TurnCheckpoint[] {
  const checkpoints: TurnCheckpoint[] = [];
  let state = initialState;

  for (let i = 0; i < history.length; i += 1) {
    const msg = history[i];
    if (msg.role !== "assistant" || !msg.parsed) continue;

    const userInput = history[i - 1]?.role === "user" ? history[i - 1].content : "（继续推进当前故事。）";
    const historyBefore = history.slice(0, history[i - 1]?.role === "user" ? i - 1 : i);
    checkpoints.push({
      state,
      history: historyBefore,
      summary: emptySummary,
      userInput,
    });

    const advancedState: WorldState = {
      ...state,
      date: pushDate(state.date, msg.parsed.timeAdvance),
      flow: msg.parsed.pace === "scene" ? "chain" : "weekly",
    };
    state = applyTurn(advancedState, msg.parsed);
  }

  return checkpoints;
}
