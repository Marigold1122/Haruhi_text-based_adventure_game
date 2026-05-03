import type { ChatMessage, StoryTurn } from "@/types/turn";

export function renderNaturalChatHistory(opts: {
  history: ChatMessage[];
  currentUserInput: string;
  userName?: string;
  assistantName?: string;
  maxMessages?: number;
}): string {
  const userName = opts.userName?.trim() || "User";
  const assistantName = opts.assistantName?.trim() || "Assistant";
  const messages = opts.history.slice(-(opts.maxMessages ?? 12));
  const rendered = messages
    .map((message) => renderMessage(message, userName, assistantName))
    .filter(Boolean);

  if (opts.currentUserInput.trim()) {
    rendered.push(`${userName}：\n${opts.currentUserInput.trim()}`);
  }

  return rendered.join("\n\n");
}

export function renderStoryTurnAsNaturalText(turn: StoryTurn): string {
  if (turn.blocks?.length) {
    return turn.blocks
      .map((block) => {
        if (block.type === "dialogue") {
          return `${block.speaker}${block.mood ? `（${block.mood}）` : ""}：「${block.text}」`;
        }
        return block.text;
      })
      .filter((part) => part.trim())
      .join("\n");
  }

  const dialogue = turn.dialogue
    .map((line) => {
      const text = line.text.trim();
      if (!text) return "";
      const speaker = line.speaker.trim();
      return speaker ? `${speaker}：「${text}」` : `「${text}」`;
    })
    .filter(Boolean);

  return [turn.narration, ...dialogue].filter((part) => part.trim()).join("\n\n");
}

function renderMessage(message: ChatMessage, userName: string, assistantName: string): string {
  if (message.role === "system") return "";
  const label = message.role === "assistant" ? assistantName : userName;
  const contentFromMessage = stripStructuredNoise(message.content);
  const content = contentFromMessage || (message.parsed ? renderStoryTurnAsNaturalText(message.parsed) : "");
  if (!content.trim()) return "";
  return `${label}：\n${content.trim()}`;
}

function stripStructuredNoise(text: string): string {
  let next = text.trim();
  const tagged = next.match(/<event_json>([\s\S]*?)<\/event_json>/i);
  if (tagged) {
    try {
      const parsed = JSON.parse(tagged[1].trim()) as Partial<StoryTurn>;
      return [
        typeof parsed.narration === "string" ? parsed.narration : "",
        Array.isArray(parsed.dialogue)
          ? parsed.dialogue.map((line) => `${line.speaker ?? ""}：「${line.text ?? ""}」`).join("\n")
          : "",
      ].filter(Boolean).join("\n\n");
    } catch {
      return "";
    }
  }
  next = next.replace(/```(?:json)?[\s\S]*?```/gi, "");
  next = next.replace(/\b(?:eventTitle|stateChanges|timeAdvance|requiresChoice|choices)\b\s*:/g, "");
  return next.trim();
}
