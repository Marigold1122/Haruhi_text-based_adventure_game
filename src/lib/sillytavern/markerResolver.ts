import type { CharacterCardV2 } from "@/types/character";
import type { ChatMessage } from "@/types/turn";
import { applySillyTavernMacros, createMacroState } from "./macroEngine";

export type MarkerResolverContext = {
  card: CharacterCardV2;
  history: ChatMessage[];
  currentUserInput: string;
  worldInfoBefore: string;
  worldInfoAfter: string;
  personaDescription: string;
  historyText?: string;
  userName?: string;
};

export type MarkerResolution = {
  content: string;
  handled: boolean;
};

export function resolveSillyTavernMarker(identifier: string, context: MarkerResolverContext): MarkerResolution {
  const data = context.card.data;
  switch (identifier) {
    case "charDescription":
      return handled(data.description);
    case "charPersonality":
      return handled(data.personality);
    case "scenario":
      return handled(data.scenario);
    case "dialogueExamples":
      return handled(data.mes_example);
    case "worldInfoBefore":
      return handled(context.worldInfoBefore);
    case "worldInfoAfter":
      return handled(context.worldInfoAfter);
    case "chatHistory":
      return handled(context.historyText ?? renderChatHistory(context.history, context.currentUserInput));
    case "personaDescription":
      return handled(context.personaDescription);
    default:
      return { content: "", handled: false };
  }
}

export function applyCommonSillyTavernMacros(content: string, context: MarkerResolverContext): string {
  return applySillyTavernMacros(content, context, createMacroState(), { allowSetVar: false });
}

function renderChatHistory(history: ChatMessage[], currentUserInput: string): string {
  const lines = history.map((message) => {
    const label = message.role === "assistant" ? "assistant" : message.role;
    const content = message.parsed ? renderTurnForPrompt(message.parsed) : message.content;
    return `[${label}]\n${content}`;
  });
  lines.push(`[user]\n${currentUserInput}`);
  return lines.join("\n\n");
}

function renderTurnForPrompt(turn: NonNullable<ChatMessage["parsed"]>): string {
  if (turn.blocks?.length) {
    return turn.blocks
      .map((block) => {
        if (block.type === "dialogue") {
          return `${block.speaker}${block.mood ? `（${block.mood}）` : ""}：「${block.text}」`;
        }
        return block.text;
      })
      .filter((part) => part.trim())
      .join("\n\n");
  }

  const dialogue = turn.dialogue
    .map((line) => {
      const text = line.text.trim();
      if (!text) return "";
      const speaker = line.speaker.trim();
      return speaker ? `${speaker}: ${text}` : text;
    })
    .filter(Boolean);
  return [turn.narration, ...dialogue].filter((part) => part.trim()).join("\n\n");
}

function handled(content: string): MarkerResolution {
  return { content, handled: true };
}

