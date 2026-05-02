import type { StoryTurn } from "@/types/turn";

export function adaptNaturalTextToStoryTurn(raw: string): StoryTurn {
  const narration = cleanNaturalText(raw);
  return {
    eventTitle: makeTitle(narration),
    scene: "",
    time: "",
    mood: "继续",
    narration,
    dialogue: extractDialogue(narration),
    stateChanges: {},
    pace: "scene",
    timeAdvance: {},
    requiresChoice: true,
    choices: [
      "继续观察眼前的变化",
      "主动开口推动当前事件",
      "把注意力转向细节线索",
    ],
  };
}

export function cleanNaturalText(raw: string): string {
  let text = raw.trim();
  const body = text.match(/<正文>([\s\S]*?)<\/正文>/i);
  if (body?.[1]?.trim()) {
    text = body[1].trim();
  }

  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*\/?\s*(?:正文|content|body|response|answer|story|narration)\s*>/gi, "")
    .replace(/<｜(?:begin▁of▁sentence|end▁of▁sentence|User|Assistant)｜>/g, "")
    .replace(/^\s*(?:我将进行符合需求的创作：|#+\s*正式创作|正文(?:内容|如下)?\s*[:：]?)/, "")
    .trim();
}

function makeTitle(text: string): string {
  const firstLine = text.split(/\n+/).map((line) => line.trim()).find(Boolean) ?? "新的片段";
  const sentence = firstLine.split(/[。！？!?]/)[0]?.trim() || firstLine;
  return sentence.length > 28 ? `${sentence.slice(0, 28)}…` : sentence;
}

function extractDialogue(text: string): StoryTurn["dialogue"] {
  const lines: StoryTurn["dialogue"] = [];
  const re = /“([^”]{1,160})”/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) && lines.length < 6) {
    lines.push({ speaker: "", text: match[1].trim() });
  }
  return lines;
}
