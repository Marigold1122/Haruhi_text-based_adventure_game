// 8 个关键事件链：元数据 + 触发条件 + 关联世界书 chain_id
// 详细脚本由 LLM 渐进式生成（开始时让 AI 规划"本事件链共 N 节，第 N 节给结束标记"）

import type { WorldState, StartingPointId } from "@/types/worldState";

export type EventChainDef = {
  id: string;                        // 与 lorebook 的 chain_id 对齐
  title: string;
  description: string;
  totalStepsHint: number;            // 建议节数（LLM 会按此规划）
  trigger:
    | { kind: "world_state"; minHaruhiSatisfaction?: number; maxHaruhiSatisfaction?: number; minStability?: number; maxStability?: number }
    | { kind: "story"; requiresFlags?: string[]; afterEvents?: string[] }
    | { kind: "starting_point"; startingPoint: StartingPointId }
    | { kind: "manual" };
  // 仅这些身份可触发
  identityGate?: string[];
  // 优先级（同时满足多个时挑高的）
  priority: number;
};

export const eventChains: EventChainDef[] = [
  {
    id: "closed_space",
    title: "闭锁空间-神人讨伐",
    description: "春日的不满累积到临界，城市某处切出闭锁空间，神人缓慢站起。",
    totalStepsHint: 4,
    trigger: { kind: "world_state", maxHaruhiSatisfaction: -30 },
    identityGate: ["core", "anomaly", "observer"],
    priority: 80,
  },
  {
    id: "sos_quest",
    title: "SOS 团活动事件链（寻找三人组）",
    description: "春日宣布 SOS 团活动：分组在城里寻找'不可思议'。",
    totalStepsHint: 3,
    trigger: { kind: "story", requiresFlags: ["sos_founded"] },
    priority: 40,
  },
  {
    id: "baseball",
    title: "棒球大会",
    description: "春日报名了一场业余棒球比赛，团员凑齐九人——长门要不要'微调'弹道？",
    totalStepsHint: 3,
    trigger: { kind: "story", requiresFlags: ["sos_founded"] },
    priority: 45,
  },
  {
    id: "summer_island",
    title: "孤岛事件",
    description: "暑假，古泉的远房亲戚邀请孤岛别墅游。台风将至，深夜出现'尸体'。",
    totalStepsHint: 5,
    trigger: { kind: "starting_point", startingPoint: "summer_island" },
    priority: 90,
  },
  {
    id: "endless_eight",
    title: "漫无止境的八月",
    description: "暑假最后两周陷入循环。每次循环细节略变。只有长门保留全部记忆。",
    totalStepsHint: 6,
    trigger: { kind: "manual" }, // 由春日满足度低 + 暑假节点联合手动触发
    identityGate: ["core", "anomaly", "observer"],
    priority: 85,
  },
  {
    id: "festival",
    title: "文化祭电影拍摄",
    description: "春日宣布拍摄《朝比奈实玖瑠的冒险 episode 00》，剧情设定开始在现实溢出。",
    totalStepsHint: 5,
    trigger: { kind: "story", requiresFlags: ["sos_founded"] },
    priority: 60,
  },
  {
    id: "disappearance",
    title: "消失事件链",
    description: "12 月 18 日清晨，世界被改写——长门是普通人类，SOS 团从未存在。",
    totalStepsHint: 6,
    trigger: { kind: "manual" },
    identityGate: ["core", "anomaly", "observer"],
    priority: 95,
  },
  {
    id: "sasaki_faction",
    title: "佐佐木一派对峙",
    description: "佐佐木 + 橘京子 + 九曜 + 藤原 提出'世界中心转移'。阿虚被夹在中间。",
    totalStepsHint: 5,
    trigger: { kind: "manual" },
    identityGate: ["core", "anomaly", "observer"],
    priority: 90,
  },
];

// 在 eventTrigger 决定 supernatural 时，由这里挑出实际要进入哪条链
export function pickChainForState(state: WorldState): EventChainDef | null {
  const candidates = eventChains.filter((c) => {
    if (c.identityGate && !c.identityGate.includes(state.identity)) return false;
    const t = c.trigger;
    switch (t.kind) {
      case "world_state":
        if (t.minHaruhiSatisfaction !== undefined && state.haruhiSatisfaction < t.minHaruhiSatisfaction) return false;
        if (t.maxHaruhiSatisfaction !== undefined && state.haruhiSatisfaction > t.maxHaruhiSatisfaction) return false;
        if (t.minStability !== undefined && state.worldStability < t.minStability) return false;
        if (t.maxStability !== undefined && state.worldStability > t.maxStability) return false;
        return true;
      case "story":
        if (t.requiresFlags && !t.requiresFlags.every((f) => state.flags.includes(f))) return false;
        if (t.afterEvents && !t.afterEvents.every((e) => state.pastEvents.includes(e))) return false;
        return true;
      case "starting_point":
        return state.startingPoint === t.startingPoint;
      case "manual":
        return false; // 手动触发不在自动判定中
    }
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

export function findChainById(id: string): EventChainDef | undefined {
  return eventChains.find((c) => c.id === id);
}
