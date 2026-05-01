// 游戏壳子维护的世界状态
// 这些不是塞进角色卡或世界书的固定设定，而是会随玩家选择动态变化、
// 每次拼 prompt 时作为 Author's Note 注入。

import type { IdentityLevel } from "./lorebook";

export type FlowSpeed =
  | "monthly"     // 1 次 1 月（入学前/小学初中/考试前/毕业前）
  | "biweekly"    // 1 次 2 周（入学初期）
  | "weekly"      // 1 次 1 周（活跃期/假期）
  | "chain";      // 事件链中：流速由事件链自身控制

export type StartingPointId =
  | "before_north_high"
  | "north_high_entrance"
  | "sos_founded"
  | "after_members_joined"
  | "summer_island"
  | "endless_eight"
  | "festival"
  | "disappearance"
  | "sasaki_faction";

export type GameDate = {
  // 简化为 ISO 字符串 + 中文展示串，避免日期库
  iso: string;          // 例如 2002-04-08
  display: string;      // 例如 "高一 春 · 入学日"
};

export type EventChainState = {
  id: string;             // 事件链 id，例如 "closed_space"
  step: number;           // 第几节
  totalSteps: number;     // AI 规划的总节数
  endMarker?: string;     // 结束标记
  notes?: string;         // 链内累计笔记，给 LLM 看
};

export type RelationStatus = {
  name: string;
  trust: number;     // -100..100
  affection: number; // -100..100
  note?: string;     // 一句话标签：兴奋 / 疏离 / 警戒……
};

export type WorldState = {
  // 玩家身份与卷入度
  playerCharacterId: string;     // 当前扮演的角色卡 id
  identity: IdentityLevel;

  // 时间与流速
  date: GameDate;
  flow: FlowSpeed;

  // 关键全局变量（隐藏，不要直接展示给玩家）
  haruhiSatisfaction: number;    // 春日满足度 -100..100，越低越接近闭锁空间
  worldStability: number;        // 0..100，世界稳定度
  playerStress: number;          // 0..100

  // 关系网络
  relations: Record<string, RelationStatus>;

  // 标记 / 线索 / 已发生事件
  flags: string[];
  clues: string[];
  pastEvents: string[];          // 已发生的事件标题列表（盖棺定论时用）

  // 当前事件链状态机
  activeChain: EventChainState | null;

  // 当前起点
  startingPoint: StartingPointId;
};
