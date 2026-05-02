// 时间推进
//
// 1.0 之前的固定流速（weekly/biweekly/monthly）已废弃——时间推进完全由 LLM 给的
// turn.timeAdvance 字段驱动。这里只保留：
//   · pushDate(date, advance)：把 days/hours/minutes 加到当前 GameDate 上
//   · 自动给 display 末尾贴上'上午/下午/傍晚/夜'与"M 月 D 日"
//   · pickFlow / flowChangeFlavor 仅作展示性提示保留（state.flow 字段不再驱动时间）

import type { FlowSpeed, GameDate, WorldState } from "@/types/worldState";
import type { TimeAdvance } from "@/types/turn";

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
