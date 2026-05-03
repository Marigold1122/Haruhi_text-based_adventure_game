import type { ChatMessage } from "@/types/turn";

const NATIVE_STYLE_GUIDE = [
  "[Native Style Layer]",
  "这一层只增强文字质感，不改变输出协议。",
  "响应从 <event_json> 开始，以 </event_json> 结束；块外说明省略，segments 继续使用对象数组。",
  "每个 segment 保持短段节奏：一个动作、一个观察、一个反应或一句对白。",
  "TTS 信息只放 tone / emotion / delivery；dialogue.text 保留角色真正说出口的话。",
  "文风方向：轻小说校园叙事，先写可感知现场，再给短判断；心理通过脚步、视线、手上动作、声音变化和物件细节显出来。",
  "每批停在一个微选择瞬间：有人发问、道路分岔、异常贴近、读者需要回应。",
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
