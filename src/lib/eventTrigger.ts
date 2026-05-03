// 事件触发：随机数 + 固定基础概率
//
// 设计原则（按 prompt.md 第六节）：
//   - 是否触发由壳子判定，不让 AI 自主决定是否触发事件链
//   - 不同身份/时期/世界状态调整基础概率
//   - 大量"无需选择的纯叙述事件"穿插
//   - 春日满足度过低 → 闭锁空间事件链候选
//   - 早期不要轻易触发事件链（前期 chain trigger 概率极低）

import type { ActiveCanonState, DailyBudget, WorldState } from "@/types/worldState";
import type { EventPresetKind } from "@/types/preset";
import { pickChainForState } from "@/data/eventChains";
import {
  canonTimeline,
  getMainLinePendingTriggers,
  type CanonEvent,
} from "@/data/canonTimeline";

export type TriggerDecision = {
  eventKind: EventPresetKind;
  // 若触发新事件链，这里给出建议链 id 与节数；由上层决定是否真正进入
  proposedChain?: { id: string; totalSteps: number };
  reason: string;
  /**
   * 若本批被原作时间线强制驱动，这里给出焦点 canon event。
   * 上层（StoryView / playtest）应：
   *   ① 把它注入 prompt 作为本批必须叙述的事件；
   *   ② 应用层维护 state.activeCanon（增加 batchesProgress；完成时 mark triggered + 重置 cooldown）。
   */
  canonFocus?: CanonEvent;
  /**
   * 当 canonFocus 是【新启动】的（不是延续 activeCanon）时，给出建议的 activeCanon 初值。
   * 应用层据此初始化 state.activeCanon。延续模式下此字段不填，应用层只递增 batchesProgress。
   */
  proposedActiveCanon?: ActiveCanonState;
  /** 当 canonFocus 是延续 activeCanon 时为 true；新启动为 false；无 canon 也是 false */
  isCanonContinuation?: boolean;
};

/**
 * 按 scope 决定 canon 计划批数。large 事件在 canon focus 块的 scopeBudget 已声明
 * 4-6 批；这里取中间值。
 */
function plannedBatchesByScope(scope: CanonEvent["scope"]): number {
  switch (scope) {
    case "small":
      return 1; // 最低成本，1 批演完
    case "medium":
      return 2; // 2 批演完（铺垫+高潮 / 高潮+收尾）
    case "large":
      return 4; // 4 批：intro → developing → climax → resolution
  }
}

/**
 * canon 间日常剧情批数预算——按日历间隔 + 上 canon scope 计算。
 *
 * 设计来自用户反馈："canon 间的日常缓冲规模不应该固定，而是综合两个因素：
 *   ① 原著时间线两 canon 之间的间隔（天数）
 *   ② 上一个 canon 的规模（large 之后流速可以更慢）
 * "
 *
 * 公式：
 *   - gap ≤ 1 天 → 0 批（紧邻 canon 直接触发，如 12-18→12-19 消失日链）
 *   - gap ≤ 3 天 → 1 批（极短间隔）
 *   - 否则 round(gap / avgDaysPerBatch)，clamp 到 [1, 8]
 *     · large 后 avgDays=6（流速更慢，让玩家消化）
 *     · medium 后 avgDays=5
 *     · small 后 avgDays=4
 *
 * 校验（playtest 8 + canonTimeline 实测）：
 *   · 04-08(large) → 05-07: gap=29 → round(29/6)=5 批 ✓ 用户期望 3-7
 *   · 05-07(small) → 05-12: gap=5 → round(5/4)=1 批 ✓
 *   · 07-23(large) → 10-18: gap=87 → 15→clamp 8 批 ✓ 暑假
 *   · 06-25(large) → 06-28: gap=3 → 1 批 ✓ 三日改写期间
 */
export function planDailyBudget(
  prevCanonIso: string,
  prevCanonScope: CanonEvent["scope"],
  nextCanonIso: string,
): DailyBudget {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const gapDays = Math.round(
    (new Date(nextCanonIso).getTime() - new Date(prevCanonIso).getTime()) / ONE_DAY,
  );

  let plannedBatches: number;
  if (gapDays <= 1) {
    plannedBatches = 0;
  } else if (gapDays <= 3) {
    plannedBatches = 1;
  } else {
    const avgDaysPerBatch =
      prevCanonScope === "large" ? 6 : prevCanonScope === "small" ? 4 : 5;
    plannedBatches = Math.max(1, Math.min(8, Math.round(gapDays / avgDaysPerBatch)));
  }

  return {
    prevCanonIso,
    prevCanonScope,
    nextCanonIso,
    plannedBatches,
    elapsedBatches: 0,
  };
}

/** 计算当前批属于该 canon 的 narrative phase（按 batchesProgress / total 比例分段） */
function phaseFor(progress: number, total: number): ActiveCanonState["narrativePhase"] {
  if (total <= 1) return "climax"; // 1 批 canon 直接给高潮
  const ratio = progress / total;
  if (ratio < 0.3) return "intro";
  if (ratio < 0.7) return "developing";
  if (ratio < 1.0) return "climax";
  return "resolution";
}

function findCanonById(id: string): CanonEvent | undefined {
  return canonTimeline.find((e) => e.id === id);
}

/**
 * canon event.visibility → preset eventKind 的映射。
 * 给被强制触发的批次分配合适的 preset，让 LLM 调到正确语气的系统提示。
 */
function presetKindForCanonEvent(e: CanonEvent): EventPresetKind {
  if (e.visibility === "supernatural") return "supernatural";
  if (e.chainId) return "supernatural"; // 事件链事件统一走 supernatural preset
  // public / sos_internal 大多数算日常 + encounter 类
  return "encounter";
}

// 基础事件类型概率表（按身份）
// 数字之和应为 1.0；未列出的身份走 passerby 默认值
const baseProb: Record<string, Record<EventPresetKind, number>> = {
  passerby: {
    daily: 0.6, campus: 0.2, interpersonal: 0.15, encounter: 0.04,
    seasonal: 0.01, supernatural: 0,
  },
  fringe: {
    daily: 0.45, campus: 0.2, interpersonal: 0.2, encounter: 0.1,
    seasonal: 0.04, supernatural: 0.01,
  },
  core: {
    daily: 0.35, campus: 0.15, interpersonal: 0.2, encounter: 0.15,
    seasonal: 0.05, supernatural: 0.1,
  },
  anomaly: {
    daily: 0.25, campus: 0.1, interpersonal: 0.15, encounter: 0.2,
    seasonal: 0.05, supernatural: 0.25,
  },
  observer: {
    daily: 0.2, campus: 0.05, interpersonal: 0.1, encounter: 0.2,
    seasonal: 0.05, supernatural: 0.4,
  },
};

export function decideEvent(state: WorldState, rng: () => number = Math.random): TriggerDecision {
  // 优先级 1：继续正在演绎的 activeCanon（跨多批演完一个 canon 事件）
  if (state.activeCanon) {
    const focus = findCanonById(state.activeCanon.id);
    if (focus) {
      const nextProgress = state.activeCanon.batchesProgress + 1;
      return {
        eventKind: presetKindForCanonEvent(focus),
        canonFocus: focus,
        isCanonContinuation: true,
        reason: `continuing activeCanon ${focus.id} (batch ${nextProgress}/${state.activeCanon.totalBatchesPlanned}, phase=${phaseFor(nextProgress, state.activeCanon.totalBatchesPlanned)})`,
      };
    }
    // activeCanon id 找不到——异常，清空让下面正常流程接管
  }

  // 优先级 2：daily budget 检查 + 启动新 canon
  // 流程：
  //   ① 没有 dailyBudget（首批 / budget 已耗尽）→ 检查 pending canon 直接启动
  //   ② 有 dailyBudget 且 elapsedBatches < plannedBatches → 还在日常缓冲期，本批走日常
  //   ③ 有 dailyBudget 且 elapsedBatches >= plannedBatches → 缓冲期结束，下批可触发 canon
  const triggered = new Set(state.triggeredCanonEvents);
  const pending = getMainLinePendingTriggers(state.date.iso, triggered);
  if (pending.length > 0) {
    const budgetReady = !state.dailyBudget
      || state.dailyBudget.elapsedBatches >= state.dailyBudget.plannedBatches;
    if (budgetReady) {
      const focus = pending[0];
      const totalBatchesPlanned = plannedBatchesByScope(focus.scope);
      const proposedActiveCanon: ActiveCanonState = {
        id: focus.id,
        scope: focus.scope,
        batchesProgress: 1,
        totalBatchesPlanned,
        narrativePhase: phaseFor(1, totalBatchesPlanned),
      };
      const proposedChain = focus.chainId
        ? { id: focus.chainId, totalSteps: 4 }
        : undefined;
      const budgetNote = state.dailyBudget
        ? `dailyBudget exhausted (${state.dailyBudget.elapsedBatches}/${state.dailyBudget.plannedBatches})`
        : "no dailyBudget (first canon or initial)";
      return {
        eventKind: presetKindForCanonEvent(focus),
        proposedChain,
        canonFocus: focus,
        proposedActiveCanon,
        isCanonContinuation: false,
        reason: `start new canon ${focus.id} (scope=${focus.scope}, planned ${totalBatchesPlanned} batches; ${budgetNote})`,
      };
    }
    // budget 未耗尽 — 本批走日常，让 canon 之间留出真实的日常剧情过渡
  }

  // 已在事件链中：直接返回 supernatural（preset 路由会接管）
  if (state.activeChain) {
    return { eventKind: "supernatural", reason: "in active chain" };
  }

  const probs = { ...(baseProb[state.identity] ?? baseProb.passerby) };

  // 春日满足度调整：满足度过低显著抬高 supernatural 概率（仅对核心成员/异常存在/观察者）
  if (["core", "anomaly", "observer"].includes(state.identity)) {
    const sat = state.haruhiSatisfaction;
    if (sat <= -50) {
      probs.supernatural += 0.25;
      probs.daily = Math.max(0, probs.daily - 0.15);
      probs.campus = Math.max(0, probs.campus - 0.1);
    } else if (sat <= -20) {
      probs.supernatural += 0.1;
      probs.daily = Math.max(0, probs.daily - 0.1);
    }
  }

  // 早期保护：故事开头几节，supernatural 概率压到极低
  if (state.pastEvents.length < 4) {
    const reduce = probs.supernatural * 0.9;
    probs.supernatural -= reduce;
    probs.daily += reduce;
  }

  // 归一化
  const sum = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(probs) as EventPresetKind[]) probs[k] /= sum;

  // 抽签
  const r = rng();
  let acc = 0;
  let chosen: EventPresetKind = "daily";
  for (const k of Object.keys(probs) as EventPresetKind[]) {
    acc += probs[k];
    if (r <= acc) { chosen = k; break; }
  }

  // 若抽中 supernatural，从事件链定义里挑一条匹配当前状态的链
  let proposedChain: TriggerDecision["proposedChain"];
  let reason = `rolled ${chosen} (r=${r.toFixed(3)}, identity=${state.identity})`;
  if (chosen === "supernatural") {
    const chain = pickChainForState(state);
    if (chain) {
      proposedChain = { id: chain.id, totalSteps: chain.totalStepsHint };
      reason += `; matched chain ${chain.id}`;
    } else {
      // 没有合适的链可进入，回退 encounter
      chosen = "encounter";
      reason += "; supernatural rolled but no chain matched → fallback to encounter";
    }
  }

  return { eventKind: chosen, proposedChain, reason };
}

// 手动触发某条事件链（供 UI 的"调试 / 强制触发"使用）
export function manualTrigger(chainId: string, totalSteps = 4): TriggerDecision {
  return {
    eventKind: "supernatural",
    proposedChain: { id: chainId, totalSteps },
    reason: `manual trigger: ${chainId}`,
  };
}

/**
 * 批次结束时调用——根据 TriggerDecision 把 canon 进度 / dailyBudget 更新到 state。
 *
 * 四种情况：
 *   ① 本批是新启动的 canon →
 *      - 写入 activeCanon（progress=1）
 *      - 若 totalBatchesPlanned===1 直接演完：mark triggered + 清空 activeCanon + 规划下个 dailyBudget
 *      - dailyBudget 在 canon 启动期间清空（演 canon 期间不算日常）
 *   ② 本批是 activeCanon 延续 → progress += 1；达到 total → mark triggered + 清空 + 规划下个 dailyBudget
 *   ③ 本批是日常（dailyBudget 内）→ elapsedBatches += 1
 *   ④ 本批是日常（无 budget）→ 不变（首批 / 全部 canon 演完后游离态）
 */
export function applyCanonProgress(state: WorldState, decision: TriggerDecision): WorldState {
  // 情况 ①：新启动 canon
  if (decision.proposedActiveCanon) {
    const proposed = decision.proposedActiveCanon;
    if (proposed.batchesProgress >= proposed.totalBatchesPlanned) {
      // 1 批就演完（small scope, plannedBatches=1）
      return finalizeCanon(state, proposed.id, proposed.scope);
    }
    // 多批 canon，开始演绎
    return {
      ...state,
      activeCanon: proposed,
      dailyBudget: null, // canon 期间没有日常 budget
    };
  }

  // 情况 ②：延续 activeCanon
  if (decision.isCanonContinuation && decision.canonFocus && state.activeCanon) {
    const next = state.activeCanon.batchesProgress + 1;
    const total = state.activeCanon.totalBatchesPlanned;
    if (next >= total) {
      // 演完
      return finalizeCanon(state, decision.canonFocus.id, state.activeCanon.scope);
    }
    // 仍在演
    return {
      ...state,
      activeCanon: {
        ...state.activeCanon,
        batchesProgress: next,
        narrativePhase: phaseFor(next, total),
      },
      dailyBudget: null,
    };
  }

  // 情况 ③ + ④：日常批
  if (state.dailyBudget) {
    return {
      ...state,
      dailyBudget: {
        ...state.dailyBudget,
        elapsedBatches: state.dailyBudget.elapsedBatches + 1,
      },
    };
  }
  // 情况 ④：无 budget，纯游离态日常（首批 / canon 全演完）
  return state;
}

/**
 * canon 演完时调用——mark triggered + 规划下一段 dailyBudget。
 * 根据"刚演完的 canon scope" + "下一个未触发 canon 的距离"决定接下来留多少批日常。
 */
function finalizeCanon(
  state: WorldState,
  canonId: string,
  canonScope: CanonEvent["scope"],
): WorldState {
  const newTriggered = state.triggeredCanonEvents.includes(canonId)
    ? state.triggeredCanonEvents
    : [...state.triggeredCanonEvents, canonId];

  // 找下一个 main_line canon（按 ISO 升序），用本 canon 自身的日期作为间隔起点
  const triggeredSet = new Set(newTriggered);
  const justCompletedEvent = canonTimeline.find((e) => e.id === canonId);
  const startIso = justCompletedEvent?.date.iso ?? state.date.iso;
  const nextCanon = canonTimeline
    .filter((e) => e.importance === "main_line" && !triggeredSet.has(e.id))
    .sort((a, b) => a.date.iso.localeCompare(b.date.iso))[0];

  const dailyBudget = nextCanon
    ? planDailyBudget(startIso, canonScope, nextCanon.date.iso)
    : null; // 没有更多 main_line canon 了，进入纯日常游离态

  return {
    ...state,
    activeCanon: null,
    triggeredCanonEvents: newTriggered,
    dailyBudget,
  };
}
