// SillyTavern World Info / Lorebook 格式
// 参考 SillyTavern docs/usage/core-concepts/worldinfo.md
//
// 与 character_book 同源，但作为独立资产存在，可与多张角色卡关联。
// 关键概念：
//   - constant：永远注入
//   - selective + secondary_keys：主关键词 + 次关键词联合触发
//   - insertion_order：注入顺序（数字大优先级高，越靠近 prompt 末尾）
//   - position：注入位置（before_char / after_char），对应酒馆的位置选项
//   - 我们额外引入 identity_gate / chain_id 字段放进 extensions，做身份门控与事件链子集

import type { CharacterBookEntry } from "./character";

export type IdentityLevel =
  | "passerby"        // 路人学生
  | "fringe"          // SOS 团边缘人物
  | "core"            // SOS 团核心成员
  | "anomaly"         // 异常存在（外星人 / 未来人 / 超能力者 / 反 SOS）
  | "observer";       // 观察者 / 操控者

export type LoreEntry = CharacterBookEntry & {
  extensions?: {
    identity_gate?: IdentityLevel[]; // 仅在玩家身份在该集合内时启用
    chain_id?: string;               // 仅在该事件链激活时挂载
    tags?: string[];
  } & Record<string, unknown>;
};

export type Lorebook = {
  name: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions?: Record<string, unknown>;
  entries: LoreEntry[];
};
