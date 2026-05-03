// 时间推进
//
// 1.0 之前的固定流速（weekly/biweekly/monthly）已废弃——时间推进完全由 LLM 给的
// turn.timeAdvance 字段驱动。这里只保留：
//   · pushDate(date, advance)：把 days/hours/minutes 加到当前 GameDate 上
//   · 自动给 display 末尾贴上'上午/下午/傍晚/夜'与"M 月 D 日"
//   · pickFlow / flowChangeFlavor 仅作展示性提示保留（state.flow 字段不再驱动时间）

import type { FlowSpeed, GameDate, WorldState } from "@/types/worldState";
import type { TimeAdvance } from "@/types/turn";

// ---- clampTimeAdvance：基于 dailyBudget 的均摊式 clamp ----
//
// v1：固定 Tier A=3 / B=1 →【失败】日历飞跨过多个 canon
// v2：按"距下个 canon 多远"分档（>30→7、7-30→3、1-7→1、≤1→0）→【次优】临近 canon 时
//     卡同一天磨蹭，且与"canon 间日常预算"脱钩
// v3（当前）：用 dailyBudget 均摊。
//
// 当 state.dailyBudget 存在时（即在 canon 间日常缓冲期）：
//   · daysRemaining = nextCanonIso - currentDate（剩余日历天数）
//   · batchesRemaining = plannedBatches - elapsedBatches（剩余批数）
//   · idealDays = daysRemaining / batchesRemaining
//   · minDays = max(1, floor(idealDays * 0.7))
//
// 这意味着：每批至少跨"理想跨度"的 70%（防止 LLM 卡住），但不强制最大值——
// LLM 仍可主动选择某批连贯（给小 days）、某批大跨（给大 days），自然填充 canon 间日历。
//
// 当 dailyBudget 不存在（首批 / 所有 canon 已演完）→ 退回固定 Tier A=3 / B=1。
//
// Tier C（canon focus 或事件链中）：永远不 clamp，让 LLM 自由用分钟/小时。
//
// clamp 触发时丢掉 sub-day 单位（LLM 写的是场景级别，那几小时无意义）。
export function clampTimeAdvance(
  advance: TimeAdvance,
  state: WorldState,
  inCanonFocus: boolean,
): { advance: TimeAdvance; clamped: boolean; reason?: string } {
  // Tier C — 让 LLM 自由控制
  if (inCanonFocus || state.activeChain) {
    return { advance, clamped: false };
  }

  const givenDays = advance.days ?? 0;
  const subDayUsed = (advance.hours ?? 0) > 0 || (advance.minutes ?? 0) > 0;
  const minDays = computeMinDays(state);

  if (minDays === 0) {
    return { advance, clamped: false };
  }

  if (givenDays >= minDays) return { advance, clamped: false };

  return {
    advance: { days: minDays, note: advance.note },
    clamped: true,
    reason: `Budget clamp: identity=${state.identity}, ${describeBudget(state)}, given days=${givenDays}${subDayUsed ? " (+sub-day)" : ""} → forced days=${minDays}`,
  };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function computeMinDays(state: WorldState): number {
  const budget = state.dailyBudget;
  if (budget) {
    const cur = new Date(state.date.iso).getTime();
    const next = new Date(budget.nextCanonIso).getTime();
    if (!Number.isNaN(cur) && !Number.isNaN(next)) {
      const daysRemaining = (next - cur) / ONE_DAY_MS;
      // 关键：canon 已经过了 / 或在它当天 → 不强制 clamp，下批就会触发 canon。
      // 这条优先于 plannedBatches 检查——即使 budget plannedBatches=0（canon 紧邻），
      // 此分支也会避免 fall through 到 Tier A=3 造成多 turn 累计大幅过冲。
      if (daysRemaining <= 1) return 0;
      // 有 budget 且 canon 还远 → 按预算均摊
      if (budget.plannedBatches > 0) {
        const batchesRemaining = Math.max(1, budget.plannedBatches - budget.elapsedBatches);
        const ideal = daysRemaining / batchesRemaining;
        return Math.max(1, Math.floor(ideal * 0.7));
      }
      // plannedBatches=0 但 daysRemaining > 1：罕见（canon 距离 > 1 天但被规划为 0 批）
      // 此时最少推 1 天/turn，避免无 budget 时的 Tier A=3 大跨
      return 1;
    }
  }
  // 没有 budget（首批 / 所有 canon 演完后游离态）→ 固定 Tier A/B
  return state.identity === "passerby" ? 3 : 1;
}

function describeBudget(state: WorldState): string {
  if (!state.dailyBudget) return "no dailyBudget";
  const b = state.dailyBudget;
  return `budget ${b.elapsedBatches}/${b.plannedBatches} for next canon ${b.nextCanonIso}`;
}

// ---- pushDate：按 LLM timeAdvance 推进时间 ----

export function pushDate(date: GameDate, advance: TimeAdvance): GameDate {
  const d = parseGameDate(date);

  if (advance.days) d.setDate(d.getDate() + advance.days);
  if (advance.hours) d.setHours(d.getHours() + advance.hours);
  if (advance.minutes) d.setMinutes(d.getMinutes() + advance.minutes);

  return formatGameDate(d, advance.note, date.display);
}

function parseGameDate(date: GameDate): Date {
  // 兼容 "YYYY-MM-DD" 与 "YYYY-MM-DDTHH:MM"
  const iso = /T/.test(date.iso) ? date.iso : `${date.iso}T08:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function formatGameDate(d: Date, note: string | undefined, prevDisplay: string): GameDate {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;

  const head = headPrefix(prevDisplay); // "高一 春 ·" 之类
  const ymd = `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  const tod = timeOfDay(d);
  const tail = note?.trim() ? note.trim() : `${ymd} · ${tod}`;
  const display = head ? `${head} ${tail}` : tail;
  return { iso, display };
}

function headPrefix(prevDisplay: string): string {
  // "高一 春 · 入学日（4 月 8 日）" → "高一 春 ·"
  const m = prevDisplay.match(/^([^·]+?·)/);
  return m ? m[1].trim() : "";
}

export function timeOfDay(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "凌晨";
  if (h < 8) return "清晨";
  if (h < 11) return "上午";
  if (h < 14) return "中午";
  if (h < 17) return "下午";
  if (h < 19) return "傍晚";
  if (h < 22) return "夜里";
  return "深夜";
}

// ---- 仅作展示性提示：当前节奏标签 ----

export function flowLabelFor(state: WorldState): string {
  if (state.activeChain) return "事件链节奏";
  // 入学初期 / SOS 初创 / 假期：默认日常感
  if (state.flags.includes("graduation") || state.flags.includes("exam_period")) return "考试 / 毕业前";
  return "日常感（一段 ≈ 一两天）";
}

// ---- 旧 API 保留兜底（StoryView 在 LLM 没填 timeAdvance 时用 fallback）----

export function pickFlow(state: WorldState): FlowSpeed {
  if (state.activeChain) return "chain";
  if (state.flags.includes("entrance_period")) return "biweekly";
  if (state.flags.includes("exam_period") || state.flags.includes("graduation")) return "monthly";
  return "weekly";
}

export function flowChangeFlavor(prev: FlowSpeed, next: FlowSpeed): string | null {
  if (prev === next) return null;
  const map: Record<string, string> = {
    "weekly→chain": "周遭的钟摆停了。从这里开始，时间将由眼前的事件自己安排。",
    "chain→weekly": "事件结束。空气里又重新塞回了普通日子的味道。",
  };
  return map[`${prev}→${next}`] ?? null;
}
