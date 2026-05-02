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

export function adaptNaturalTextToStoryTurns(raw: string): StoryTurn[] {
  const text = cleanNaturalText(raw);
  if (!text) return [adaptNaturalTextToStoryTurn(raw)];
  const parts = splitNaturalText(text);
  const title = makeTitle(text);
  return parts.map((part, index) => {
    const parsed = parseDialogueSegment(part);
    const isFirst = index === 0;
    const isLast = index === parts.length - 1;
    return {
      eventTitle: isFirst ? title : "",
      scene: "",
      time: "",
      mood: parsed.mood ?? "继续",
      narration: parsed.text,
      speaker: parsed.speaker,
      dialogue: [],
      stateChanges: {},
      pace: "scene",
      timeAdvance: isLast ? {} : { minutes: 0 },
      requiresChoice: isLast,
      choices: isLast
        ? [
            "继续观察眼前的变化",
            "主动开口推动当前事件",
            "把注意力转向细节线索",
          ]
        : [],
    };
  });
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

function splitNaturalText(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const source = paragraphs.length > 1 ? paragraphs : [text.trim()];
  const parts = source.flatMap((part) => splitLongParagraph(part, 110));
  return parts.length > 0 ? parts.slice(0, 24) : [text.trim()];
}

function splitLongParagraph(paragraph: string, maxLen: number): string[] {
  if (paragraph.length <= maxLen) return [paragraph];
  const sentences = paragraph.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [paragraph];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const next = sentence.trim();
    if (!next) continue;
    if (current && current.length + next.length > maxLen) {
      chunks.push(current);
      current = next;
    } else {
      current += next;
    }
  }
  if (current) chunks.push(current);
  return chunks.flatMap((chunk) => hardSplit(chunk, maxLen + 50));
}

function hardSplit(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}

function parseDialogueSegment(text: string): { speaker?: string; mood?: string; text: string } {
  const trimmed = text.trim();
  const match = trimmed.match(/^([^：:「『""''（）()\s]{1,16})(?:[（(]([^）)]{1,12})[）)])?[：:]\s*[「『"“']([\s\S]+?)[」』"”']?$/);
  if (!match) return { text: trimmed };
  return {
    speaker: match[1].trim(),
    mood: match[2]?.trim(),
    text: match[3].trim(),
  };
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
