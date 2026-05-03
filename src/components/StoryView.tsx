import { useEffect, useMemo, useRef, useState } from "react";

import type { CharacterCardV2 } from "@/types/character";
import type { Lorebook } from "@/types/lorebook";
import type { WorldState } from "@/types/worldState";
import type { ChatMessage, StoryTurn } from "@/types/turn";

import { fallbackTurn, parseEventJsonBatch, runLLMBatch, runLLMText } from "@/lib/llm";
import { expandCardDescription, type RandomCharacterSeed } from "@/lib/randomMode";
import { applyTurn } from "@/lib/worldState";
import { pushDate } from "@/lib/timeAdvance";
import { decideEvent } from "@/lib/eventTrigger";
import { governTurn } from "@/lib/plot/plotGovernor";
import { type SummaryState, emptySummary, maybeUpdateSummary, tailHistory } from "@/lib/summary";
import { startingPointById } from "@/data/startingPoints";
import { renderTimelineContext } from "@/data/canonTimeline";
import { renderIdentityGuide } from "@/data/identityGuide";
import { rollEnding, generateEndingNarrative, type EndingTrigger } from "@/lib/ending";
import { save, load, clear, type SaveBlob } from "@/lib/storage";
import { loadSettings } from "@/lib/settings";
import { buildPromptForTurn } from "@/lib/prompting";
import type { PromptBuildTrace, PromptMode } from "@/lib/prompting/types";
import { adaptNaturalTextToStoryTurns, cleanNaturalText } from "@/lib/prompting/storyTurnAdapter";
import { formatStyleLintProblems, lintStoryStyle, sanitizeStoryStyleText } from "@/lib/prompting/storyStyleLinter";
import { buildStoryMetadataPrompt } from "@/lib/prompting/writerAdapterPromptEngine";
import { parseSillyTavernPresetJson } from "@/lib/sillytavern/presetParser";
import {
  applySillyTavernRegexScripts,
  applySillyTavernRegexToTurn,
  SILLYTAVERN_REGEX_PLACEMENT,
} from "@/lib/sillytavern/regexEngine";
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
  /** 仅随机模式新开局时存在；驱动后台 description 扩展 */
  expandSeed?: RandomCharacterSeed;
  /** 后台扩展完成后的回调，用来把扩展后的 card 写回 App state */
  onCardUpdate?: (card: CharacterCardV2) => void;
};

type TurnCheckpoint = {
  state: WorldState;
  history: ChatMessage[];
  summary: SummaryState;
  userInput: string;
};

/** 队列长度上限——只要 < 这个值就持续 prefetch，让缓冲始终饱满 */
const MAX_QUEUE = 8;

/**
 * 互动节奏兜底：契约要求每批必须以 requiresChoice=true 收尾（每批必含一个选择节点）。
 * 这里的兜底逻辑只在 LLM 失约时触发——上一批最后一段 requiresChoice 不是 true，
 * 就在下一批 prompt 追加硬性指令把它强制带回正轨。
 * 契约守约时不追加任何额外内容，以保持 prompt 干净。
 */

export function StoryView({ card, lorebook, initialState, characterId, customCard, resumeFrom, onReset, expandSeed, onCardUpdate }: Props) {
  const [state, setState] = useState<WorldState>(resumeFrom?.state ?? initialState);
  const [history, setHistory] = useState<ChatMessage[]>(resumeFrom?.history ?? []);
  const [summary, setSummary] = useState<SummaryState>(resumeFrom?.summary ?? emptySummary);
  const [turns, setTurns] = useState<StoryTurn[]>(
    () => (resumeFrom?.history ?? []).flatMap((m) => (m.parsed ? [m.parsed] : [])),
  );
  const [turnCheckpoints, setTurnCheckpoints] = useState<TurnCheckpoint[]>(
    () => buildTurnCheckpoints(initialState, resumeFrom?.history ?? []),
  );

  /** 已从 LLM 拿到、还没被玩家"点开"的段落队列 */
  const [queue, setQueue] = useState<StoryTurn[]>([]);
  /** 是否需要给玩家显示思考态（队列空 + 没缓存时为 true） */
  const [showThinking, setShowThinking] = useState(false);
  /** 是否有后台 prefetch 在进行（不显示思考态，但需要避免重复触发） */
  const prefetchingRef = useRef(false);

  const [pending, setPending] = useState<string | null>(null);
  const [trace, setTrace] = useState<PromptBuildTrace | null>(null);
  const [promptRuntime, setPromptRuntime] = useState<PromptRuntime>(() => loadPromptRuntime());
  const [showSettings, setShowSettings] = useState(false);
  const [ending, setEnding] = useState<EndingTrigger | null>(null);
  const [endingText, setEndingText] = useState<string | null>(null);
  const [endingErr, setEndingErr] = useState<string | null>(null);

  const initRef = useRef(false);
  /** 后台扩展 description 的触发标记——本会话只跑一次，无论成败 */
  const expandTriggeredRef = useRef(false);

  // 第一轮：自动用"故事开场"信号触发一次推进（仅在不是 resume 时）
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (!resumeFrom) {
      prefetchingRef.current = true;
      void fetchBatch("__story_open__", { showThinking: true, consumeFirst: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 后台扩展 description——两段式生成的第二阶段。
   * 触发条件：随机模式新开局 + card 还是 stub + 首批剧情已落地 + 玩家不在思考态。
   * 延迟 5 秒启动，让玩家先开始阅读首批；这次调用与故事预取串行（让 prefetchingRef 接管时机）。
   */
  useEffect(() => {
    if (expandTriggeredRef.current) return;
    if (!expandSeed) return;
    if (!card.data.extensions?.description_pending_expand) return;
    if (turns.length === 0) return;
    if (showThinking) return;

    expandTriggeredRef.current = true;
    const timer = window.setTimeout(async () => {
      try {
        const updated = await expandCardDescription(card, expandSeed);
        if (updated.data.description !== card.data.description && onCardUpdate) {
          console.log("[expandCardDescription] 完整 XML 已写回 card.description（", updated.data.description.length, "字符）");
          onCardUpdate(updated);
        }
      } catch (e) {
        console.warn("[expandCardDescription] 后台扩展失败，保留最小卡：", e);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns.length, showThinking]);

  /**
   * 玩家在思考态等待时，如果后台 prefetch 回来了——自动消费一段并关闭 thinking。
   * 这覆盖一种场景：玩家追上了已经在跑的预取请求（不能等到下一次点击才看）。
   */
  useEffect(() => {
    if (!showThinking) return;
    if (queue.length === 0) return;
    const [first, ...rest] = queue;
    setQueue(rest);
    setTurns((prev) => [...prev, first]);
    setShowThinking(false);
  }, [showThinking, queue.length]);

  /**
   * 持续后台预取：只要 queue 没满到上限、没在请求、当前段不需要选择、故事没结束——
   * 立刻在后台启动新请求，让 LLM 一直在后台跑，缓冲始终饱满。
   * 关键：预取时所有段都进 queue（consumeFirst=false），不会"自动弹出"段落。
   */
  useEffect(() => {
    if (showThinking) return;             // 玩家正在等待 / LLM 正在初始请求
    if (prefetchingRef.current) return;   // 已有后台请求
    if (ending) return;                   // 故事结束
    if (queue.length >= MAX_QUEUE) return; // 缓冲已满
    if (queue.some((t) => t.requiresChoice)) return; // 不越过尚未展示的选择节点预取

    const lastShown = turns[turns.length - 1];
    if (lastShown?.requiresChoice) return; // 当前段要玩家选择，不能预取后续

    if (turns.length === 0 && queue.length === 0) return; // 等首轮完成

    prefetchingRef.current = true;
    void fetchBatch("（继续推进当前故事。）", { showThinking: false, consumeFirst: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, turns.length, showThinking, ending]);

  const lastTurn = useMemo(() => turns[turns.length - 1], [turns]);

  // ============================================================
  // 核心：fetch / consume / prefetch 三层
  // ============================================================

  /**
   * 调用 LLM 拿一批段落。
   * - consumeFirst=true：第一段直接进 turns（玩家立刻看到）；其余进 queue。
   *   场景：故事开场 / 玩家选择后 / 玩家点继续但 queue 空。
   * - consumeFirst=false：所有段都进 queue。
   *   场景：后台静默预取——绝对不能让段落自动弹出。
   *
   * stateChanges + 时间推进在【批次返回时一次性】应用——下一次预取拿到的状态是最新的。
   */
  async function fetchBatch(
    userInput: string,
    opts: { showThinking: boolean; consumeFirst: boolean },
  ): Promise<void> {
    const baseState = state;
    const baseHistory = history;
    const baseSummary = summary;

    if (opts.showThinking) setShowThinking(true);

    try {
      await doFetchBatch(userInput, opts, baseState, baseHistory, baseSummary);
    } finally {
      // 无论成功失败都清掉 in-flight 标记，保证 effect 能再次触发
      prefetchingRef.current = false;
      if (opts.showThinking) setShowThinking(false);
    }
  }

  async function doFetchBatch(
    userInput: string,
    opts: { showThinking: boolean; consumeFirst: boolean },
    baseState: WorldState,
    baseHistory: ChatMessage[],
    baseSummary: SummaryState,
  ): Promise<void> {
    const decision = decideEvent(baseState);
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

    let promptUser =
      userInput === "__story_open__"
        ? "（故事开始。请按 scenario 与世界书自然展开本轮事件，不要直接介绍角色。请按输出协议返回多段。）"
        : userInput;

    // 互动节奏兜底：契约要求每批以 requiresChoice=true 收尾。若上一批失约（最后段不是 choice），
    // 在本批 prompt 追加硬性指令；契约守约时不追加。
    const allGeneratedSegments = [...turns, ...queue];
    const lastSeg = allGeneratedSegments[allGeneratedSegments.length - 1];
    const lastBatchFailedContract = allGeneratedSegments.length > 0 && !lastSeg?.requiresChoice;
    if (lastBatchFailedContract) {
      let segsSinceLastChoice = 0;
      for (let i = allGeneratedSegments.length - 1; i >= 0; i -= 1) {
        if (allGeneratedSegments[i].requiresChoice) break;
        segsSinceLastChoice += 1;
      }
      promptUser += `\n\n【系统节奏兜底】上一批没有以 requiresChoice=true 收尾（已累计 ${segsSinceLastChoice} 段无选择）。本批必须严格以一个 requiresChoice=true 段落收尾并给出 2-4 个完整可执行的行动选项——这是契约硬性要求。`;
      if (typeof console !== "undefined") {
        console.warn(
          `[fetchBatch] LLM 上批失约（${segsSinceLastChoice} 段无 choice）；本批已注入兜底指令`,
        );
      }
    }

    const visibleHistory = tailHistory(baseHistory, baseSummary);
    const sceneCast = startingPointById[next.startingPoint]?.sceneCast;
    const governed = governTurn({
      trigger: decision,
      state: next,
      history: baseHistory,
      userInput: promptUser,
      sceneCast,
    });
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
      eventKind: governed.plot.eventKind,
      history: visibleHistory,
      summary: baseSummary.text,
      userInput: promptUser,
      sceneCast,
      timelineContext,
      identityGuide,
      canonFocus: decision.canonFocus,
      plotDecision: governed.plot,
      blandness: governed.blandness,
    });
    if (decision.canonFocus && typeof console !== "undefined") {
      console.log(
        `[fetchBatch] 原作时间线驱动：本批焦点 = ${decision.canonFocus.id}（${decision.canonFocus.title}，${decision.canonFocus.date.iso}）`,
      );
    }
    setTrace(withRuntimeWarnings(built.trace, promptRuntime));

    let raw = "";
    let batch: StoryTurn[] = [];
    if (built.trace.outputMode === "two-pass") {
      try {
        const metadata = buildStoryMetadataPrompt({
          state: next,
          userInput: promptUser,
          characterName: card.data.name,
          sampling: built.sampling,
        });
        const [writerResult, metadataResult] = await Promise.allSettled([
          runLLMText({ messages: built.messages, sampling: built.sampling }),
          runLLMText({ messages: metadata.messages, sampling: metadata.sampling }),
        ]);

        if (writerResult.status === "rejected") {
          const msg = writerResult.reason instanceof Error ? writerResult.reason.message : String(writerResult.reason);
          throw new Error(msg);
        }

        const rawNatural = writerResult.value;
        const cleanedNatural = cleanNaturalText(rawNatural);
        const styleSanitized = sanitizeStoryStyleText(cleanedNatural || rawNatural);
        raw = styleSanitized.text || cleanedNatural || rawNatural;
        batch = ensureFinalChoiceForTwoPass(adaptNaturalTextToStoryTurns(raw));

        const metadataTurn = metadataResult.status === "fulfilled"
          ? parseEventJsonBatch(metadataResult.value)[0]
          : undefined;
        if (metadataTurn) {
          batch = mergeParallelMetadata(batch, metadataTurn);
        }

        setTrace((prev) => prev ? ({
          ...prev,
          warnings: [
            ...(prev.warnings ?? []),
            ...(metadataResult.status === "rejected"
              ? [`并行元数据生成失败，已使用规则兜底：${metadataResult.reason instanceof Error ? metadataResult.reason.message : String(metadataResult.reason)}`]
              : metadataTurn
                ? []
                : ["并行元数据未解析成功，已使用规则兜底。"]),
            ...styleSanitized.applied.map((name) => `夏瑾式输出清洗：${name}`),
          ],
          naturalTextLength: rawNatural.length,
          adapterMode: metadataTurn ? "parallel-llm" : "rule",
          messageCount: (prev.messageCount ?? 0) + metadata.messages.length,
        }) : prev);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        batch = [fallbackTurn(`LLM 调用失败：${msg}`)];
        setTrace((prev) => prev ? ({
          ...prev,
          warnings: [...(prev.warnings ?? []), `Writer/Adapter 调用失败：${msg}`],
          adapterMode: "rule",
        }) : prev);
      }
    } else if (built.trace.outputMode === "natural") {
      try {
        const rawNatural = await runLLMText({ messages: built.messages, sampling: built.sampling });
        const useStPresetRuntime = isSillyTavernMode(built.trace.mode) && Boolean(promptRuntime.preset);
        const outputRegex = useStPresetRuntime
          ? applySillyTavernRegexScripts(
            rawNatural,
            promptRuntime.preset?.extensions?.regex_scripts,
            SILLYTAVERN_REGEX_PLACEMENT.AI_OUTPUT,
            { depth: 0 },
          )
          : { text: rawNatural, applied: [], warnings: [] };
        const cleanedNatural = cleanNaturalText(outputRegex.text);
        const strippedStructuredOutput = cleanedNatural !== outputRegex.text.trim();
        const useNativeStyleSanitizer = built.trace.mode === "writer-adapter";
        const styleSanitized = useNativeStyleSanitizer
          ? sanitizeStoryStyleText(cleanedNatural || outputRegex.text)
          : { text: cleanedNatural || outputRegex.text, applied: [] };
        raw = styleSanitized.text || cleanedNatural || outputRegex.text;
        batch = adaptNaturalTextToStoryTurns(raw);
        let styleFailures: string[] = [];
        let styleWarnings: string[] = [];
        const styleTraceWarnings: string[] = [];
        if (built.trace.mode === "writer-adapter") {
          const lint = lintStoryStyle(raw, batch);
          styleFailures = lint.failures;
          styleWarnings = lint.warnings;
          styleTraceWarnings.push(...formatStyleLintProblems(lint));
          if (strippedStructuredOutput) {
            styleTraceWarnings.push("已清理混入自然正文的结构化输出块。");
          }
          styleTraceWarnings.push(...styleSanitized.applied.map((name) => `夏瑾式输出清洗：${name}`));
        }
        setTrace((prev) => prev ? ({
          ...prev,
          regexHits: [...new Set([...(prev.regexHits ?? []), ...outputRegex.applied])],
          warnings: [...(prev.warnings ?? []), ...outputRegex.warnings, ...styleTraceWarnings],
          naturalTextLength: raw.length,
          adapterMode: "rule",
          styleFailures,
          styleWarnings,
        }) : prev);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        batch = [fallbackTurn(`LLM 调用失败：${msg}`)];
        setTrace((prev) => prev ? ({
          ...prev,
          warnings: [...(prev.warnings ?? []), `natural 模式调用失败：${msg}`],
          adapterMode: "rule",
        }) : prev);
      }
    } else {
      const { raw: llmRaw, turns: rawBatch } = await runLLMBatch({
        messages: built.messages,
        sampling: built.sampling,
      });
      raw = llmRaw;

      const regexHits = new Set<string>();
      const regexWarnings: string[] = [];
      batch = rawBatch.map((t) => {
        const r = applyPresetOutputRegex(t, promptRuntime);
        r.applied.forEach((n) => regexHits.add(n));
        regexWarnings.push(...r.warnings);
        return r.turn;
      });
      if (regexHits.size || regexWarnings.length) {
        setTrace((prev) => prev ? ({
          ...prev,
          regexHits: [...new Set([...(prev.regexHits ?? []), ...regexHits])],
          warnings: [...(prev.warnings ?? []), ...regexWarnings],
        }) : prev);
      }
    }

    // 调试可见：每批次实际段数 + 类型（旁白/对白）
    if (typeof console !== "undefined") {
      console.log(
        `[fetchBatch] batch length = ${batch.length}; segments =`,
        batch.map((t) => (t.speaker ? `dialogue(${t.speaker})` : "narration")),
      );
      if (batch.length < 5) {
        console.warn(
          `[fetchBatch] 只展开出 ${batch.length} 段——预期 12-18 段（日常）/ 6-10 段（关键场景）。可能是 LLM 没用 narrations 字符串数组，或字符串数组太短。原始响应：`,
          raw.slice(0, 1000),
        );
      }
    }

    if (batch.length === 0) return;

    const userMsg: ChatMessage = { role: "user", content: promptUser };
    const aiMsg: ChatMessage = {
      role: "assistant",
      content: storesAssistantAsNaturalHistory(promptRuntime.mode) ? renderBatchForPrompt(batch) : raw,
      parsed: batch[0],
    };
    const nextHistory = [...baseHistory, userMsg, aiMsg];

    // 时间推进 + 状态变化：累加批次中【每一段】的 stateChanges + timeAdvance
    let advanced = next;
    for (const t of batch) {
      advanced = applyTurn(
        { ...advanced, date: pushDate(advanced.date, t.timeAdvance), flow: t.pace === "scene" ? "chain" : "weekly" },
        t,
      );
    }

    // 若本批被原作时间线强制驱动 → 把焦点 canon event id 标记为已触发，避免重复
    if (decision.canonFocus) {
      advanced = {
        ...advanced,
        triggeredCanonEvents: [...advanced.triggeredCanonEvents, decision.canonFocus.id],
      };
    }

    // 异步 Rolling Summary
    maybeUpdateSummary({ history: nextHistory, prev: baseSummary }).then(setSummary);

    setHistory(nextHistory);
    setState(advanced);
    setTurnCheckpoints((prev) => [
      ...prev,
      { state: baseState, history: baseHistory, summary: baseSummary, userInput: promptUser },
    ]);

    if (opts.consumeFirst) {
      // 玩家点击触发的请求：第一段立刻显示
      setTurns((prev) => [...prev, batch[0]]);
      setQueue((prev) => [...prev, ...batch.slice(1)]);
    } else {
      // 后台预取：所有段都进队列，绝不主动消费
      setQueue((prev) => [...prev, ...batch]);
    }

    setPending(null);

    // 终结判定
    const trigger = rollEnding(advanced);
    if (trigger) {
      void runEnding(trigger, advanced, nextHistory);
    }
  }

  /**
   * 消费下一段：把 queue[0] 弹到 turns。
   * 自动 prefetch 由 useEffect 接管，不在这里触发。
   */
  function consumeNext(): void {
    if (queue.length === 0) {
      // 队列空：升级为思考态等待
      if (!prefetchingRef.current) {
        prefetchingRef.current = true;
        void fetchBatch("（继续推进当前故事。）", { showThinking: true, consumeFirst: true });
      } else {
        // 已经在后台预取了，但玩家追上了——把后台预取升级为可见 thinking
        setShowThinking(true);
      }
      return;
    }

    const next = queue[0];
    setQueue((q) => q.slice(1));
    setTurns((prev) => [...prev, next]);
  }

  // ============================================================
  // 编辑功能（沿用之前的 turn-level 操作）
  // ============================================================

  function deleteLatestTurn() {
    if (showThinking || turns.length === 0) return;
    const checkpoint = turnCheckpoints[turnCheckpoints.length - 1];
    if (!checkpoint) return;
    setState(checkpoint.state);
    setHistory(checkpoint.history);
    setSummary(checkpoint.summary);
    setTurns((prev) => prev.slice(0, -1));
    setTurnCheckpoints((prev) => prev.slice(0, -1));
    setQueue([]); // 删除一段后队列内容已不可信
    setPending(null);
    setTrace(null);
  }

  function regenerateLatestTurn() {
    if (showThinking || turns.length === 0) return;
    const checkpoint = turnCheckpoints[turnCheckpoints.length - 1];
    if (!checkpoint) return;
    setState(checkpoint.state);
    setHistory(checkpoint.history);
    setSummary(checkpoint.summary);
    setTurns((prev) => prev.slice(0, -1));
    setTurnCheckpoints((prev) => prev.slice(0, -1));
    setQueue([]);
    setPending(checkpoint.userInput);
    prefetchingRef.current = true;
    void fetchBatch(checkpoint.userInput, { showThinking: true, consumeFirst: true });
  }

  function updateLatestTurn(updated: StoryTurn) {
    if (turns.length === 0) return;
    setTurns((prev) => [...prev.slice(0, -1), updated]);
    setHistory((prev) => replaceLastParsedAssistant(
      prev,
      updated,
      storesAssistantAsNaturalHistory(promptRuntime.mode) ? renderTurnForPrompt(updated) : serializeTurn(updated),
    ));
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

  // ============================================================
  // 玩家交互
  // ============================================================

  function onChoose(text: string) {
    if (showThinking) return;
    setPending(text);
    // 玩家选择 / 自定义行动 → 清空队列，重新请求
    setQueue([]);
    prefetchingRef.current = true;
    void fetchBatch(text, { showThinking: true, consumeFirst: true });
  }

  function onContinue() {
    if (showThinking) return;
    setPending(null);
    consumeNext();
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
    setQueue([]);
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
            loading={showThinking}
            onAdvance={onContinue}
            onDeleteLatest={deleteLatestTurn}
            onRegenerateLatest={regenerateLatestTurn}
            onUpdateLatest={updateLatestTurn}
          />
        </main>

        <StatusPanel
          state={state}
          characterName={card.data.name}
          trace={trace}
          summaryStatus={summary}
          queueLength={queue.length}
          prefetching={prefetchingRef.current}
        />
      </div>

      <footer className="story-footer">
        <ChoicePanel
          choices={lastTurn?.choices ?? []}
          requiresChoice={lastTurn?.requiresChoice ?? false}
          disabled={showThinking}
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
    return { mode, stored: null, preset: null, warnings: isSillyTavernMode(mode) ? ["已选择 ST 预设模式，但尚未导入 preset，当前轮次会回退 legacy。"] : [] };
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

function ensureFinalChoiceForTwoPass(batch: StoryTurn[]): StoryTurn[] {
  if (batch.length === 0) return batch;
  const last = batch[batch.length - 1];
  if (last.requiresChoice && last.choices.length > 0) return batch;
  return [
    ...batch.slice(0, -1),
    {
      ...last,
      requiresChoice: true,
      choices: last.choices.length > 0 ? last.choices : [
        "继续观察眼前的变化",
        "主动开口推进当前事件",
        "把注意力转向细节线索",
      ],
    },
  ];
}

function mergeParallelMetadata(batch: StoryTurn[], metadata: StoryTurn): StoryTurn[] {
  if (batch.length === 0) return batch;
  const lastIndex = batch.length - 1;
  return batch.map((turn, index) => {
    if (index === 0 && index === lastIndex) {
      return mergeFirstMetadata(mergeLastMetadata(turn, metadata), metadata);
    }
    if (index === 0) return mergeFirstMetadata(turn, metadata);
    if (index === lastIndex) return mergeLastMetadata(turn, metadata);
    return {
      ...turn,
      pace: metadata.pace,
    };
  });
}

function mergeFirstMetadata(turn: StoryTurn, metadata: StoryTurn): StoryTurn {
  return {
    ...turn,
    eventTitle: metadata.eventTitle || turn.eventTitle,
    scene: metadata.scene || turn.scene,
    time: metadata.time || turn.time,
    mood: turn.mood || metadata.mood,
    pace: metadata.pace,
  };
}

function mergeLastMetadata(turn: StoryTurn, metadata: StoryTurn): StoryTurn {
  return {
    ...turn,
    stateChanges: metadata.stateChanges ?? turn.stateChanges,
    pace: metadata.pace,
    timeAdvance: metadata.timeAdvance,
    requiresChoice: true,
    choices: metadata.choices.length > 0 ? metadata.choices : turn.choices,
    chain: metadata.chain ?? turn.chain,
  };
}

function applyPresetOutputRegex(
  turn: StoryTurn,
  runtime: PromptRuntime,
): { turn: StoryTurn; applied: string[]; warnings: string[] } {
  if (runtime.mode !== "sillytavern-preset" || !runtime.preset) {
    return { turn, applied: [], warnings: [] };
  }
  return applySillyTavernRegexToTurn(turn, runtime.preset.extensions?.regex_scripts, { depth: 0 });
}

function isSillyTavernMode(mode: PromptMode): boolean {
  return mode === "sillytavern-preset" || mode === "sillytavern-preset-natural";
}

function storesAssistantAsNaturalHistory(mode: PromptMode): boolean {
  return mode === "writer-adapter" || isSillyTavernMode(mode);
}

function renderTurnForPrompt(turn: StoryTurn): string {
  if (turn.blocks?.length) {
    return turn.blocks
      .map((block) => {
        if (block.type === "dialogue") {
          return `${block.speaker}${block.mood ? `（${block.mood}）` : ""}：「${block.text}」`;
        }
        return block.text;
      })
      .filter((part) => part.trim())
      .join("\n");
  }

  const currentLine = turn.speaker
    ? `${turn.speaker}${turn.mood ? `（${turn.mood}）` : ""}：「${turn.narration}」`
    : turn.narration;
  const dialogue = turn.dialogue
    .map((line) => {
      const text = line.text.trim();
      if (!text) return "";
      const speaker = line.speaker.trim();
      return speaker ? `${speaker}: ${text}` : text;
    })
    .filter(Boolean);
  return [currentLine, ...dialogue].filter((part) => part.trim()).join("\n\n");
}

function renderBatchForPrompt(batch: StoryTurn[]): string {
  return batch.map(renderTurnForPrompt).filter((part) => part.trim()).join("\n\n");
}

function replaceLastParsedAssistant(history: ChatMessage[], turn: StoryTurn, content: string): ChatMessage[] {
  const next = [...history];
  for (let i = next.length - 1; i >= 0; i -= 1) {
    const msg = next[i];
    if (msg.role === "assistant" && msg.parsed) {
      next[i] = {
        ...msg,
        parsed: turn,
        content,
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
