import { useEffect, useMemo, useRef, useState } from "react";

import type { CharacterCardV2 } from "@/types/character";
import type { Lorebook } from "@/types/lorebook";
import type { WorldState } from "@/types/worldState";
import type { ChatMessage, StoryTurn } from "@/types/turn";

import { assemblePrompt, pickPreset } from "@/lib/promptRouter";
import { runLLM } from "@/lib/llm";
import { applyTurn } from "@/lib/worldState";
import { advanceDate, pickFlow, flowChangeFlavor } from "@/lib/timeAdvance";
import { decideEvent } from "@/lib/eventTrigger";

import { TopBar } from "./TopBar";
import { MessageStream } from "./MessageStream";
import { ChoicePanel } from "./ChoicePanel";
import { StatusPanel } from "./StatusPanel";

type Props = {
  card: CharacterCardV2;
  lorebook: Lorebook;
  initialState: WorldState;
  onReset: () => void;
};

export function StoryView({ card, lorebook, initialState, onReset }: Props) {
  const [state, setState] = useState<WorldState>(initialState);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [turns, setTurns] = useState<StoryTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [trace, setTrace] = useState<{ presetName: string; activeLoreEntries: string[] } | null>(null);
  const [flowFlavor, setFlowFlavor] = useState<string | null>(null);
  const initRef = useRef(false);

  // 第一轮：自动用"故事开场"信号触发一次推进
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void advance("__story_open__");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastChoices = useMemo(() => turns[turns.length - 1]?.choices ?? [], [turns]);

  async function advance(userInput: string) {
    setLoading(true);

    // 1) 触发判定
    const decision = decideEvent(state);

    // 2) 选 Preset
    const preset = pickPreset({ eventKind: decision.eventKind, state });

    // 3) 时间推进 / 流速调整（开场不推进）
    let next = state;
    if (userInput !== "__story_open__") {
      const nextFlow = pickFlow(state);
      const flavor = flowChangeFlavor(state.flow, nextFlow);
      if (flavor) setFlowFlavor(flavor);
      next = {
        ...state,
        flow: nextFlow,
        date: nextFlow === "chain" ? state.date : advanceDate(state.date, nextFlow),
      };
    }

    // 4) 若决策提议进入新事件链且当前未在链中，注入事件链状态机起点
    if (!next.activeChain && decision.proposedChain) {
      next = {
        ...next,
        activeChain: { id: decision.proposedChain, step: 1, totalSteps: 4 },
      };
    }

    // 5) 拼装 prompt
    const promptUser =
      userInput === "__story_open__"
        ? "（故事开始。请按 scenario 与世界书自然展开本轮事件，不要直接介绍角色。）"
        : userInput;

    const assembled = assemblePrompt({
      card,
      lorebook,
      preset,
      state: next,
      history,
      summary: null, // 大窗口直接喂完整历史；超长时再启用
      userInput: promptUser,
    });
    setTrace({ presetName: assembled.trace.presetName, activeLoreEntries: assembled.trace.activeLoreEntries });

    // 6) 调 LLM
    const { raw, turn } = await runLLM({ messages: assembled.messages, sampling: preset.sampling });

    // 7) 写回历史与状态
    const userMsg: ChatMessage = { role: "user", content: promptUser };
    const aiMsg: ChatMessage = { role: "assistant", content: raw, parsed: turn };
    const nextHistory = [...history, userMsg, aiMsg];
    const finalState = applyTurn(next, turn);

    setHistory(nextHistory);
    setTurns((prev) => [...prev, turn]);
    setState(finalState);
    setLoading(false);
    setPending(null);
  }

  function onChoose(text: string) {
    if (loading) return;
    setPending(text);
    void advance(text);
  }

  function onAdvanceClick() {
    if (loading) return;
    setPending("（继续观察周围……）");
    void advance("我什么也不做，继续观察周围。");
  }

  return (
    <div className="story-view">
      <TopBar
        title={`凉宫春日 · ${card.data.name}`}
        subtitle={state.date.display}
        onReset={onReset}
      />

      <div className="story-body">
        <main className="story-main" onClick={onAdvanceClick} role="button" tabIndex={0}>
          {flowFlavor && (
            <div className="flow-flavor" onClick={(e) => { e.stopPropagation(); setFlowFlavor(null); }}>
              {flowFlavor}
            </div>
          )}
          <MessageStream turns={turns} pendingUserAction={pending} loading={loading} />
        </main>

        <StatusPanel state={state} characterName={card.data.name} trace={trace} />
      </div>

      <footer className="story-footer">
        <ChoicePanel choices={lastChoices} disabled={loading} onChoose={onChoose} />
      </footer>
    </div>
  );
}
