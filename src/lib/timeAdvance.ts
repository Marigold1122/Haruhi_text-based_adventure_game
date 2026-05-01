// 时间推进：根据当前流速把 ISO 日期向前滚一段。
// 流速分段：
//   monthly  — 1 月
//   biweekly — 2 周
//   weekly   — 1 周
//   chain    — 由事件链自身控制，本工具默认 0 天（不推进）

import type { FlowSpeed, GameDate, WorldState } from "@/types/worldState";

const DAYS = { monthly: 30, biweekly: 14, weekly: 7, chain: 0 } as const;

export function advanceDate(date: GameDate, flow: FlowSpeed): GameDate {
  const d = new Date(date.iso);
  d.setDate(d.getDate() + DAYS[flow]);
  const iso = d.toISOString().slice(0, 10);
  return { iso, display: composeDisplay(iso, date.display) };
}

// 简单 display 拼装：保留原前缀（"高一 春 · ..."），更新月日尾巴
function composeDisplay(iso: string, prevDisplay: string): string {
  const [, m, day] = iso.split("-");
  const headMatch = prevDisplay.match(/^([^·]+·)/);
  const head = headMatch ? headMatch[1].trim() : "";
  return `${head} ${parseInt(m, 10)} 月 ${parseInt(day, 10)} 日`;
}

// 流速选择策略：根据日期 / 标记 / 事件链状态决定下一轮的 flow
export function pickFlow(state: WorldState): FlowSpeed {
  if (state.activeChain) return "chain";
  if (state.flags.includes("entrance_period")) return "biweekly";
  if (state.flags.includes("exam_period") || state.flags.includes("graduation")) return "monthly";
  return "weekly";
}

// 流速切换的沉浸式提示语（仅在切换时由 UI 调用）
export function flowChangeFlavor(prev: FlowSpeed, next: FlowSpeed): string | null {
  if (prev === next) return null;
  const map: Record<string, string> = {
    "weekly→biweekly": "时间忽然慢了下来——日子开始一周一周拖着走。",
    "biweekly→weekly": "节奏被某种东西推着加快了。",
    "weekly→chain": "周遭的钟摆停了。从这里开始，时间将由眼前的事件自己安排。",
    "chain→weekly": "事件结束。空气里又重新塞回了普通日子的味道。",
    "monthly→weekly": "从入学初期那种漫长拖沓里出来，每一周都开始有了形状。",
    "weekly→monthly": "考试 / 毕业临近。日子开始以月为单位地翻过去。",
  };
  return map[`${prev}→${next}`] ?? `叙事节奏从「${prev}」切换为「${next}」。`;
}
