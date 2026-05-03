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

/**
 * 当前正在演绎的 canon 事件（跨多批）。
 * 每个 canon 不再"一批结束就 mark triggered"——而是按 scope 分摊到多批：
 *   small  → 1-2 批（短场景）
 *   medium → 2-3 批（标准事件）
 *   large  → 4-6 批（关键转折，需要充分铺垫与高潮）
 *
 * 每批 narrative phase 的引导：
 *   intro       (开端) — 玩家进入场景、铺垫氛围
 *   developing  (发展) — 事件主体推进、关键对白
 *   climax      (高潮) — 真正的转折时刻、最强戏剧张力
 *   resolution  (收尾) — 余波、下一步暗示
 */
export type ActiveCanonState = {
  id: string;
  scope: "small" | "medium" | "large";
  batchesProgress: number;       // 已演了几批（含本批）
  totalBatchesPlanned: number;   // 计划共几批
  narrativePhase: "intro" | "developing" | "climax" | "resolution";
};

/**
 * canon 间日常剧情预算——根据日历间隔 + 上 canon scope 决定多少批日常。
 * plannedBatches=0 表示"canon 紧接着另一个 canon，无日常缓冲"。
 */
export type DailyBudget = {
  /** 上个 canon 演完时的日期（用作"距下个 canon"的起点参考）*/
  prevCanonIso: string;
  /** 上个 canon 的 scope（影响 avgDaysPerBatch：large 后流速更慢）*/
  prevCanonScope: "small" | "medium" | "large";
  /** 下个 canon 的 ISO 日期（决定 daysRemaining）*/
  nextCanonIso: string;
  /** 计划留给日常的批数 */
  plannedBatches: number;
  /** 已用批数 */
  elapsedBatches: number;
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

  /**
   * 已经被原作时间线触发过的 canon event id 列表。
   * 当 state.date 跨过某个 main_line canon event 的日期、且该 id 不在此列表中，
   * eventTrigger 会强制把它作为本批的剧情焦点（保证主线必然按时发生）。
   * 触发后 id 追加到此列表，避免重复触发。
   * 注意：含义是"已演完毕"——activeCanon 期间该 id 不在此列表里，演完才加。
   */
  triggeredCanonEvents: string[];

  /**
   * 当前正在演绎的 canon 事件（跨多批）。null 表示"目前没有正在演的 canon"。
   * eventTrigger 优先继续 activeCanon；完成后才 mark triggered。
   */
  activeCanon: ActiveCanonState | null;

  /**
   * canon 间日常剧情的"预算"——按下个 canon 实际日历距离 + 上 canon scope 计算。
   * 设计意图：
   *   · 入学日 (large) → 剪短发，间隔 29 天 → ~5 批日常缓冲（每批均摊 6 天）
   *   · 剪短发 (small) → SOS 团成立，间隔 5 天 → ~1 批日常
   *   · 暑假 long gap (87 天) → clamp 到 8 批上限
   *   · 紧邻 canon (gap ≤ 1) → 0 批（直接触发下一个）
   *
   * 数据流：
   *   1. canon 演完时（applyCanonProgress 完成态）→ 计算并写入 dailyBudget
   *   2. 每批日常结束 → elapsedBatches += 1
   *   3. elapsedBatches >= plannedBatches → 下批可触发 canon，dailyBudget 清空
   */
  dailyBudget: DailyBudget | null;

  // 当前事件链状态机
  activeChain: EventChainState | null;

  // 当前起点
  startingPoint: StartingPointId;
};
