import type { ChatMessage } from "@/types/turn";

const NATIVE_STYLE_GUIDE = [
  "[Native Style Layer]",
  "这一层只增强文字质感，不改变输出协议。",
  "必须继续只输出一个 <event_json>...</event_json> 块，且 segments 必须是对象数组。",
  "每个 segment 保持短段节奏：一个动作、一个观察、一个反应或一句对白，不要合并成长篇正文。",
  "对白的 tone / emotion / delivery 是给 TTS 的元数据，不要写进台词 text 或旁白正文。",
  "文风偏轻小说校园叙事：具体场景细节、人物动作反应、对白节拍、克制的内心观察；避免说明书口吻。",
  "禁止输出 <正文>、</正文>、<thinking>、【正文】、正文如下、Markdown 代码块、模型自述或任何块外说明。",
].join("\n");

export function applyNativeStyleGuide(messages: ChatMessage[]): ChatMessage[] {
  const next = [...messages];
  const insertAt = findFinalUserMessageIndex(next);
  const styleMessage: ChatMessage = { role: "system", content: NATIVE_STYLE_GUIDE };
  if (insertAt < 0) return [...next, styleMessage];
  next.splice(insertAt, 0, styleMessage);
  return next;
}

function findFinalUserMessageIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return i;
  }
  return -1;
}
