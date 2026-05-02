import { useEffect, useMemo, useRef, useState } from "react";

import type { CharacterCardV2 } from "@/types/character";
import type { Lorebook } from "@/types/lorebook";
import type { WorldState } from "@/types/worldState";
import type { ChatMessage, StoryTurn } from "@/types/turn";

import { assemblePrompt, pickPreset } from "@/lib/promptRouter";
import { runLLM } from "@/lib/llm";
import { applyTurn } from "@/lib/worldState";
import { pushDate } from "@/lib/timeAdvance";
import { decideEvent } from "@/lib/eventTrigger";
import { type SummaryState, emptySummary, maybeUpdateSummary, tailHistory } from "@/lib/summary";
import { startingPointById } from "@/data/startingPoints";
import { findOutline } from "@/data/storyOutlines";
import type { BeatContext } from "@/lib/promptRouter";
import { rollEnding, generateEndingNarrative, type EndingTrigger } from "@/lib/ending";
import { save, load, clear, type SaveBlob } from "@/lib/storage";
import { loadSettings } from "@/lib/settings";

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

export function StoryView({ card, lorebook, initialState, characterId, customCard, resumeFrom, onReset }: Props) {
  const [state, setState] = useState<WorldState>(resumeFrom?.state ?? initialState);
  const [history, setHistory] = useState<ChatMessage[]>(resumeFrom?.history ?? []);
  const [summary, setSummary] = useState<SummaryState>(resumeFrom?.summary ?? emptySummary);
  const [turns, setTurns] = useState<StoryTurn[]>(
    () => (resumeFrom?.history ?? []).flatMap((m) => (m.parsed ? [m.parsed] : [])),
  );
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [trace, setTrace] = useState<{ presetName: string; activeLoreEntries: string[] } | null>(null);
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
    setLoading(true);

    const decision = decideEvent(state);
    const preset = pickPreset({ eventKind: decision.eventKind, state });

    // 时间推进现在完全由 LLM 上一轮的 timeAdvance 决定——这一轮调用前不再预先推进
    let next = state;

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
    const visibleHistory = tailHistory(history, summary);

    const sceneCast = startingPointById[next.startingPoint]?.sceneCast;

    // 当前节拍上下文（按 currentBeatIndex 切片）
    const outline = findOutline(next.startingPoint);
    let beat: BeatContext | undefined;
    if (outline) {
      const idx = Math.min(next.currentBeatIndex, outline.beats.length - 1);
      const cur = outline.beats[idx];
      const nxt = outline.beats[idx + 1];
      beat = {
        arc: outline.arc,
        currentIndex: idx,
        total: outline.beats.length,
        current: {
          title: cur.title,
          summary: cur.summary,
          pace: cur.pace,
          requiresChoice: cur.requiresChoice,
          choiceHint: cur.choiceHint,
          expectedSpan: cur.expectedSpan,
        },
        next: nxt
          ? { title: nxt.title, summary: nxt.summary }
          : undefined,
      };
    }

    const assembled = assemblePrompt({
      card,
      lorebook,
      preset,
      state: next,
      history: visibleHistory,
      summary: summary.text,
      userInput: promptUser,
      sceneCast,
      beat,
    });
    setTrace({ presetName: assembled.trace.presetName, activeLoreEntries: assembled.trace.activeLoreEntries });

    const { raw, turn } = await runLLM({ messages: assembled.messages, sampling: preset.sampling });

    const userMsg: ChatMessage = { role: "user", content: promptUser };
    const aiMsg: ChatMessage = { role: "assistant", content: raw, parsed: turn };
    const nextHistory = [...history, userMsg, aiMsg];

    // 时间推进 + 节拍推进
    const advancedState: WorldState = {
      ...next,
      date: pushDate(next.date, turn.timeAdvance),
      flow: turn.pace === "scene" ? "chain" : "weekly",
      // beatComplete=true 时推进到下一节拍（不超过最后一节）
      currentBeatIndex: turn.beatComplete && outline
        ? Math.min(next.currentBeatIndex + 1, outline.beats.length - 1)
        : next.currentBeatIndex,
    };
    const finalState = applyTurn(advancedState, turn);

    // 异步更新 Rolling Summary（不阻塞 UI）
    maybeUpdateSummary({ history: nextHistory, prev: summary }).then(setSummary);

    setHistory(nextHistory);
    setTurns((prev) => [...prev, turn]);
    setState(finalState);
    setLoading(false);
    setPending(null);

    // 终结判定
    const trigger = rollEnding(finalState);
    if (trigger) {
      void runEnding(trigger, finalState, nextHistory);
    }
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
    void advance("（继续推进。请按当前节奏自然延续故事——日常段落用 summary 跳过 1-2 天，关键节点用 scene。）");
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
          <MessageStream turns={turns} pendingUserAction={pending} loading={loading} />
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
        <SettingsModal initial={loadSettings()} onClose={() => setShowSettings(false)} />
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
