// 事件触发：随机数 + 固定基础概率
//
// 设计原则（按 prompt.md 第六节）：
//   - 是否触发由壳子判定，不让 AI 自主决定是否触发事件链
//   - 不同身份/时期/世界状态调整基础概率
//   - 大量"无需选择的纯叙述事件"穿插
//   - 春日满足度过低 → 闭锁空间事件链候选
//   - 早期不要轻易触发事件链（前期 chain trigger 概率极低）

import type { WorldState } from "@/types/worldState";
import type { EventPresetKind } from "@/types/preset";
import { pickChainForState } from "@/data/eventChains";

export type TriggerDecision = {
  eventKind: EventPresetKind;
  // 若触发新事件链，这里给出建议链 id 与节数；由上层决定是否真正进入
  proposedChain?: { id: string; totalSteps: number };
  reason: string;
};

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
