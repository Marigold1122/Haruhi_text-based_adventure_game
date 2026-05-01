// 世界状态：应用 StoryTurn.stateChanges 到 WorldState
// 同时维护 pastEvents、relations、identity 升级。

import type { WorldState } from "@/types/worldState";
import type { StoryTurn, StateChanges } from "@/types/turn";

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export function applyTurn(state: WorldState, turn: StoryTurn): WorldState {
  const c: StateChanges = turn.stateChanges ?? {};

  const next: WorldState = {
    ...state,
    haruhiSatisfaction: clamp(state.haruhiSatisfaction + (c.haruhiSatisfactionDelta ?? 0), -100, 100),
    worldStability: clamp(state.worldStability + (c.worldStabilityDelta ?? 0), 0, 100),
    playerStress: clamp(state.playerStress + (c.playerStressDelta ?? 0), 0, 100),
    flags: dedup([
      ...state.flags.filter((f) => !(c.removeFlags ?? []).includes(f)),
      ...(c.addFlags ?? []),
    ]),
    clues: dedup([...state.clues, ...(c.addClues ?? [])]),
    pastEvents: [...state.pastEvents, turn.eventTitle],
    relations: { ...state.relations },
    activeChain: state.activeChain,
    identity: c.identityShift ?? state.identity,
  };

  for (const u of c.relationUpdates ?? []) {
    const key = relationKey(u.name);
    const cur = state.relations[key] ?? { name: u.name, trust: 0, affection: 0, note: undefined };
    next.relations[key] = {
      name: u.name,
      trust: clamp(cur.trust + (u.trustDelta ?? 0), -100, 100),
      affection: clamp(cur.affection + (u.affectionDelta ?? 0), -100, 100),
      note: u.note ?? cur.note,
    };
  }

  // 事件链推进：若 turn.chain 存在，更新 activeChain；endMarker 命中则清空
  if (turn.chain) {
    if (turn.chain.endMarker && turn.chain.step >= turn.chain.totalSteps) {
      next.activeChain = null;
    } else {
      next.activeChain = {
        id: turn.chain.id,
        step: turn.chain.step,
        totalSteps: turn.chain.totalSteps,
        endMarker: turn.chain.endMarker,
        notes: state.activeChain?.notes,
      };
    }
  }

  return next;
}

function dedup<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function relationKey(name: string): string {
  // 简化：用名字直接作 key；NPC 重名问题留给后续扩展
  const m: Record<string, string> = {
    凉宫春日: "haruhi",
    春日: "haruhi",
    长门有希: "nagato",
    长门: "nagato",
    朝比奈实玖瑠: "asahina",
    朝比奈: "asahina",
    实玖瑠: "asahina",
    古泉一树: "koizumi",
    古泉: "koizumi",
  };
  return m[name] ?? name;
}
