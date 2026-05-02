import type { CharacterCardV2 } from "@/types/character";
import type { ChatMessage } from "@/types/turn";

export type MarkerResolverContext = {
  card: CharacterCardV2;
  history: ChatMessage[];
  currentUserInput: string;
  worldInfoBefore: string;
  worldInfoAfter: string;
  personaDescription: string;
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
      return handled(renderChatHistory(context.history, context.currentUserInput));
    case "personaDescription":
      return handled(context.personaDescription);
    default:
      return { content: "", handled: false };
  }
}

export function applyCommonSillyTavernMacros(content: string, context: MarkerResolverContext): string {
  const data = context.card.data;
  return content
    .replace(/\{\{char\}\}/g, data.name)
    .replace(/\{\{user\}\}/g, data.name)
    .replace(/\{\{input\}\}/g, context.currentUserInput)
    .replace(/<USER>/g, data.name)
    .replace(/<BOT>/g, data.name);
}

function renderChatHistory(history: ChatMessage[], currentUserInput: string): string {
  const lines = history.map((message) => {
    const label = message.role === "assistant" ? "assistant" : message.role;
    return `[${label}]\n${message.content}`;
  });
  lines.push(`[user]\n${currentUserInput}`);
  return lines.join("\n\n");
}

function handled(content: string): MarkerResolution {
  return { content, handled: true };
}

