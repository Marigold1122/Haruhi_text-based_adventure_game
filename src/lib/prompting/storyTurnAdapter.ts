import type { StoryBlock, StoryTurn } from "@/types/turn";

const BEAT_UNIT_MAX_LENGTH = 140;
const BEAT_MIN_LENGTH = 80;
const BEAT_MAX_LENGTH = 220;
const SPEECH_VERBS = "说|问|回答|喊|叫|提醒|宣布|打断|补充|开口|念道|说道|嚷道|吐槽|反问|催促|命令|抱怨|解释|嘀咕|低语|喃喃";
const SPEECH_MODIFIERS = "压低声音|低声|小声|大声|平静|兴奋|不满|疑惑|认真|紧张|得意|笑着|皱眉|急忙|慢吞吞|毫不客气";
const QUOTE_RE = /[「『“"]([^」』”"]{1,240})[」』”"]/g;

export function adaptNaturalTextToStoryTurn(raw: string): StoryTurn {
  const narration = cleanNaturalText(raw);
  return {
    eventTitle: makeTitle(narration),
    scene: "",
    time: "",
    mood: "继续",
    narration,
    blocks: narration ? [{ type: "narration", text: narration }] : undefined,
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
  let lastSpeaker: string | undefined;
  return parts.map((part, index) => {
    const parsedBeat = blocksFromBeat(part, lastSpeaker);
    const blocks = parsedBeat.blocks;
    lastSpeaker = parsedBeat.lastSpeaker ?? lastSpeaker;
    const onlyDialogue = blocks.length === 1 && blocks[0].type === "dialogue" ? blocks[0] : null;
    const isFirst = index === 0;
    const isLast = index === parts.length - 1;
    return {
      eventTitle: isFirst ? title : "",
      scene: "",
      time: "",
      mood: onlyDialogue?.mood ?? "继续",
      narration: onlyDialogue ? onlyDialogue.text : flattenBlocks(blocks),
      speaker: onlyDialogue?.speaker,
      blocks,
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

  return stripStructuredOutput(text)
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*\/?\s*(?:正文|content|body|response|answer|story|narration)\s*>/gi, "")
    .replace(/<｜(?:begin▁of▁sentence|end▁of▁sentence|User|Assistant)｜>/g, "")
    .replace(/^\s*(?:我将进行符合需求的创作：|#+\s*正式创作|正文(?:内容|如下)?\s*[:：]?)/, "")
    .trim();
}

function stripStructuredOutput(text: string): string {
  return text
    .replace(/<event_json>[\s\S]*?<\/event_json>/gi, "")
    .replace(/<event_json>[\s\S]*$/gi, "")
    .replace(/<\/event_json>/gi, "")
    .replace(/```(?:json|event_json)?\s*[\s\S]*?```/gi, (block) => (
      /"(?:eventTitle|stateChanges|choices|worldFlags|availableActions|visibleNPCs)"/i.test(block)
        ? ""
        : block
    ))
    .replace(/\n\s*\{[\s\S]*?(?:"(?:eventTitle|stateChanges|choices|worldFlags|availableActions|visibleNPCs)")[\s\S]*$/i, "");
}

function splitNaturalText(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const units = paragraphs.length > 1
    ? paragraphs.flatMap((paragraph) => splitLongParagraph(paragraph, BEAT_UNIT_MAX_LENGTH))
    : splitLongParagraph(text.trim(), BEAT_UNIT_MAX_LENGTH);
  const parts = groupBeatUnits(units);
  return parts.length > 0 ? parts : [text.trim()];
}

function groupBeatUnits(units: string[]): string[] {
  const beats: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const unit of units.map((part) => part.trim()).filter(Boolean)) {
    const nextLen = currentLen + unit.length;
    if (current.length > 0 && currentLen >= BEAT_MIN_LENGTH && nextLen > BEAT_MAX_LENGTH) {
      beats.push(current.join("\n\n"));
      current = [unit];
      currentLen = unit.length;
    } else {
      current.push(unit);
      currentLen = nextLen;
    }
  }
  if (current.length > 0) beats.push(current.join("\n\n"));
  return beats;
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

function blocksFromParsedSegment(parsed: { speaker?: string; mood?: string; text: string }): StoryBlock[] {
  if (parsed.speaker) {
    return [{
      type: "dialogue",
      speaker: parsed.speaker,
      text: parsed.text,
      mood: parsed.mood,
      tts: parsed.mood ? { tone: parsed.mood } : undefined,
    }];
  }
  return [{ type: "narration", text: parsed.text }];
}

function blocksFromBeat(beat: string, fallbackSpeaker?: string): { blocks: StoryBlock[]; lastSpeaker?: string } {
  const blocks: StoryBlock[] = [];
  let lastSpeaker = fallbackSpeaker;

  for (const line of beat
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)) {
    const lineBlocks = blocksFromLine(line, lastSpeaker);
    for (const block of lineBlocks) {
      blocks.push(block);
      if (block.type === "dialogue" && block.speaker) {
        lastSpeaker = block.speaker;
      }
    }
  }

  return { blocks, lastSpeaker };
}

function blocksFromLine(line: string, fallbackSpeaker?: string): StoryBlock[] {
  const parsed = parseDialogueSegment(line);
  if (parsed.speaker) return blocksFromParsedSegment(parsed);
  return blocksFromInlineDialogue(line, fallbackSpeaker);
}

function blocksFromInlineDialogue(line: string, fallbackSpeaker?: string): StoryBlock[] {
  QUOTE_RE.lastIndex = 0;
  const blocks: StoryBlock[] = [];
  let cursor = 0;
  let foundDialogue = false;
  let match: RegExpExecArray | null;

  while ((match = QUOTE_RE.exec(line)) !== null) {
    const quoteStart = match.index;
    const quoteEnd = QUOTE_RE.lastIndex;
    const quoteText = match[1].trim();
    if (!quoteText) continue;

    const before = line.slice(cursor, quoteStart);
    const cueBefore = parseCueBefore(before);
    const after = line.slice(quoteEnd);
    const cueAfter = parseCueAfter(after);
    const isStandaloneSpeech = line.slice(cursor).trim().startsWith(match[0]) && /[。！？!?…]$/.test(quoteText);
    const explicitSpeaker = cueBefore.speaker ?? cueAfter.speaker;
    const speaker = explicitSpeaker ?? (isStandaloneSpeech ? fallbackSpeaker : undefined);
    const shouldExtract = Boolean(explicitSpeaker || cueBefore.mood || cueAfter.mood || isStandaloneSpeech);

    if (!shouldExtract) {
      continue;
    }

    pushNarration(blocks, cueBefore.narrationBefore);
    const mood = cueBefore.mood ?? cueAfter.mood ?? inferMood(`${before}${after}`);
    blocks.push(makeDialogueBlock(speaker ?? "", quoteText, mood));
    foundDialogue = true;

    cursor = quoteEnd + (cueAfter.skipAfter ?? 0);
  }

  if (!foundDialogue) return [{ type: "narration", text: line }];
  pushNarration(blocks, line.slice(cursor));
  return blocks;
}

function makeDialogueBlock(speaker: string, text: string, mood?: string): StoryBlock {
  return {
    type: "dialogue",
    speaker,
    text,
    mood,
    tts: mood ? { tone: mood, emotion: mood } : undefined,
  };
}

function pushNarration(blocks: StoryBlock[], text: string): void {
  const trimmed = cleanupNarrationFragment(text);
  if (!trimmed) return;
  const last = blocks[blocks.length - 1];
  if (last?.type === "narration") {
    last.text = `${last.text}${trimmed}`;
    return;
  }
  blocks.push({ type: "narration", text: trimmed });
}

function cleanupNarrationFragment(text: string): string {
  return text
    .replace(/^[，,。！？!?；;：:\s]+/, "")
    .replace(/[：:\s]+$/, "")
    .trim();
}

function parseCueBefore(before: string): { speaker?: string; mood?: string; narrationBefore: string } {
  const direct = before.match(/(?:^|[，。！？；、\s])([^，。！？；、：“”「」『』\s]{1,16})(?:[（(]([^）)]{1,12})[）)])?[：:]\s*$/);
  if (direct?.[1] && isLikelySpeaker(direct[1])) {
    return {
      speaker: direct[1].trim(),
      mood: direct[2]?.trim() || undefined,
      narrationBefore: before.slice(0, direct.index).trim(),
    };
  }

  const spoken = before.match(new RegExp(`(?:^|[，。！？；、\\s])([^，。！？；、：“”「」『』\\s]{1,16})(?:[（(]([^）)]{1,12})[）)])?(?:${SPEECH_MODIFIERS})?(?:地)?(?:${SPEECH_VERBS})(?:道)?[：:]?\\s*$`));
  if (spoken?.[1] && isLikelySpeaker(spoken[1])) {
    return {
      speaker: spoken[1].trim(),
      mood: spoken[2]?.trim() || inferMood(spoken[0]),
      narrationBefore: before.slice(0, spoken.index).trim(),
    };
  }

  return { narrationBefore: before };
}

function parseCueAfter(after: string): { speaker?: string; mood?: string; skipAfter?: number } {
  const spoken = after.match(new RegExp(`^\\s*([^，。！？；、：“”「」『』\\s]{1,16})(?:[（(]([^）)]{1,12})[）)])?(?:${SPEECH_MODIFIERS})?(?:地)?(?:${SPEECH_VERBS})(?:道)?[。！？!?，,；;：:]?`));
  if (!spoken?.[1] || !isLikelySpeaker(spoken[1])) return {};
  return {
    speaker: spoken[1].trim(),
    mood: spoken[2]?.trim() || inferMood(spoken[0]),
    skipAfter: spoken[0].length,
  };
}

function isLikelySpeaker(value: string): boolean {
  const speaker = value.trim();
  if (!speaker || speaker.length > 16) return false;
  if (/[看望转面朝对盯扫伸推拉把拿放走跑坐站觉得意识感觉]/.test(speaker) && speaker !== "我") return false;
  return true;
}

function inferMood(context: string): string | undefined {
  if (/压低声音|低声|小声|嘀咕|低语|喃喃/.test(context)) return "低声";
  if (/兴奋|高兴|开心|眼睛发亮|拍桌/.test(context)) return "兴奋";
  if (/不满|皱眉|瞪|生气|恼火/.test(context)) return "不满";
  if (/紧张|慌|发抖|结巴/.test(context)) return "紧张";
  if (/平静|淡淡|面无表情|照旧/.test(context)) return "平静";
  if (/认真|严肃|正色/.test(context)) return "认真";
  if (/疑惑|困惑|不解|歪头/.test(context)) return "疑惑";
  if (/得意|骄傲|扬起下巴/.test(context)) return "得意";
  return undefined;
}

function flattenBlocks(blocks: StoryBlock[]): string {
  return blocks.map((block) => block.text).filter(Boolean).join("\n");
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
