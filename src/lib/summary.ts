// Rolling Summary：超过阈值时调用 LLM 把更早的历史压缩成中文摘要。
// 摘要会作为额外 system 消息插入到 prompt 第 6 步（在历史之后、Author's Note 之前）。
//
// 触发策略：
//   - history 长度 > MAX_TURNS_BEFORE_SUMMARY（默认 24 条 = 12 轮）时，
//     把前 N 条（默认 12 条）压缩成摘要，并从 history 中"折叠"——保留最后 K 轮原文。
//   - 折叠后的 history 仍然完整，只是前面的轮次被替换成一个 system 摘要消息。

import type { ChatMessage } from "@/types/turn";
import { runLLMText } from "./llm";

export const MAX_TURNS_BEFORE_SUMMARY = 24; // assistant + user 总条数
export const KEEP_TAIL_TURNS = 8;            // 折叠时保留的尾部条数

export type SummaryState = {
  text: string | null;        // 当前累计的摘要
  collapsedUntilIndex: number; // 已折叠到 history 的哪个 index（不含）
};

export const emptySummary: SummaryState = { text: null, collapsedUntilIndex: 0 };

export async function maybeUpdateSummary(opts: {
  history: ChatMessage[];
  prev: SummaryState;
}): Promise<SummaryState> {
  const { history, prev } = opts;
  const unfolded = history.length - prev.collapsedUntilIndex;
  if (unfolded <= MAX_TURNS_BEFORE_SUMMARY) return prev;

  const targetEnd = history.length - KEEP_TAIL_TURNS;
  const sliceToFold = history.slice(prev.collapsedUntilIndex, targetEnd);
  if (sliceToFold.length === 0) return prev;

  const transcript = sliceToFold
    .map((m) => `[${m.role}] ${m.content}`)
    .join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "你是一个剧情摘要工程师。",
        "把以下凉宫春日校园文字冒险的历史轮次，压缩为一段中文摘要，便于后续上下文复用。",
        "要求：",
        "1) 保留关键事件、人物变化、世界状态趋势（春日满足度的高低、世界稳定的趋势、关键 flag）。",
        "2) 保留若干最具风味的对白片段（每段加引号）。",
        "3) 保留时间线起点与当前节点。",
        "4) 字数控制在 350-700 中文字。",
        "5) 不要解释，不要前置寒暄，直接输出摘要正文。",
      ].join("\n"),
    },
    { role: "user", content: transcript },
  ];

  let summary: string;
  try {
    summary = await runLLMText({ messages, sampling: { temperature: 0.4, max_tokens: 1200 } });
  } catch {
    return prev; // 摘要失败时不折叠，下一轮再试
  }

  const merged = prev.text
    ? `${prev.text}\n\n[新增摘要]\n${summary.trim()}`
    : summary.trim();

  return { text: merged, collapsedUntilIndex: targetEnd };
}

// 给 promptRouter 用：只把"未被折叠"的尾部历史送入 prompt
export function tailHistory(history: ChatMessage[], state: SummaryState): ChatMessage[] {
  return history.slice(state.collapsedUntilIndex);
}
