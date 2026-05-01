// localStorage 简易存档：单槽位
// 保存 WorldState + 历史聊天 + 当前角色卡 id

import type { WorldState } from "@/types/worldState";
import type { ChatMessage } from "@/types/turn";

const KEY = "haruhi-text-adventure:save:v1";

export type SaveBlob = {
  state: WorldState;
  history: ChatMessage[];
  savedAt: string;
};

export function save(blob: SaveBlob): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(blob));
  } catch {
    // 忽略存储异常（隐私模式 / 配额）
  }
}

export function load(): SaveBlob | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveBlob;
  } catch {
    return null;
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
