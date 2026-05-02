// localStorage 简易存档：单槽位
// 保存 WorldState + 历史聊天 + 滚动摘要 + 当前角色卡 id

import type { WorldState } from "@/types/worldState";
import type { ChatMessage } from "@/types/turn";
import type { SummaryState } from "./summary";
import type { CharacterCardV2 } from "@/types/character";

const KEY = "haruhi-text-adventure:save:v1";

export type SaveBlob = {
  state: WorldState;
  history: ChatMessage[];
  summary: SummaryState | null;
  characterId: string;
  // 如果是从外部导入或随机生成的卡，character.id 在内置 registry 找不到——把卡本体也存下来
  customCard?: CharacterCardV2 | null;
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
