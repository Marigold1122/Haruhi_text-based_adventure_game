import type { ChatMessage } from "@/types/turn";
import { MINIMAL_EVENT_JSON_CONTRACT } from "@/lib/prompting/outputContract";
import { mapSillyTavernSampling } from "./samplingMapper";
import {
  applyCommonSillyTavernMacros,
  resolveSillyTavernMarker,
  type MarkerResolverContext,
} from "./markerResolver";
import type {
  SillyTavernChatCompletionPreset,
  SillyTavernCompiledPrompt,
  SillyTavernPrompt,
  SillyTavernPromptOrder,
} from "./presetTypes";

export type SillyTavernPresetCompileOptions = {
  presetName?: string;
  preferredCharacterId?: number;
  maxTokensCap?: number;
};

export function compileSillyTavernPresetPrompt(opts: {
  preset: SillyTavernChatCompletionPreset;
  markerContext: MarkerResolverContext;
  options?: SillyTavernPresetCompileOptions;
}): SillyTavernCompiledPrompt {
  const { preset, markerContext, options } = opts;
  const warnings: string[] = [];
  const markerHits: string[] = [];
  const skippedPrompts: string[] = [];
  const prompts = Array.isArray(preset.prompts) ? preset.prompts : [];
  const promptById = new Map<string, SillyTavernPrompt>();

  for (const prompt of prompts) {
    if (prompt.identifier) promptById.set(prompt.identifier, prompt);
  }

  const order = choosePromptOrder(preset.prompt_order, options?.preferredCharacterId);
  const orderedItems = order
    ? order.order.filter((item) => item.enabled)
    : prompts
        .filter((prompt) => prompt.identifier)
        .map((prompt) => ({ identifier: prompt.identifier as string, enabled: true }));

  const messages: ChatMessage[] = [];

  for (const item of orderedItems) {
    const prompt = promptById.get(item.identifier);
    if (!prompt) {
      skippedPrompts.push(item.identifier);
      continue;
    }

    const compiled = compilePrompt(prompt, markerContext, markerHits);
    if (!compiled.trim()) {
      skippedPrompts.push(prompt.name || prompt.identifier || "(empty prompt)");
      continue;
    }

    pushMergedMessage(messages, {
      role: mapRole(prompt.role),
      content: compiled,
    });
  }

  if (!markerHits.includes("chatHistory")) {
    pushMergedMessage(messages, {
      role: "user",
      content: markerContext.currentUserInput,
    });
    warnings.push("prompt_order 未启用 chatHistory marker，已追加当前用户输入作为兜底。");
  }

  pushMergedMessage(messages, {
    role: "system",
    content: MINIMAL_EVENT_JSON_CONTRACT,
  });

  const sampling = mapSillyTavernSampling(preset, { maxTokensCap: options?.maxTokensCap });
  const presetName = options?.presetName || preset.name || "SillyTavern Preset";

  return {
    messages,
    sampling,
    trace: {
      mode: "sillytavern-preset",
      presetName,
      promptOrderCharacterId: order?.character_id,
      enabledPromptCount: orderedItems.length,
      markerHits,
      skippedPrompts,
      warnings,
      messageCount: messages.length,
      sampling,
    },
  };
}

function choosePromptOrder(
  orders: SillyTavernPromptOrder[] | undefined,
  preferredCharacterId?: number,
): SillyTavernPromptOrder | null {
  if (!Array.isArray(orders) || orders.length === 0) return null;
  if (preferredCharacterId !== undefined) {
    const preferred = orders.find((order) => order.character_id === preferredCharacterId);
    if (preferred) return preferred;
  }
  return [...orders].sort((a, b) => countEnabled(b) - countEnabled(a))[0] ?? null;
}

function countEnabled(order: SillyTavernPromptOrder): number {
  return order.order.filter((item) => item.enabled).length;
}

function compilePrompt(
  prompt: SillyTavernPrompt,
  context: MarkerResolverContext,
  markerHits: string[],
): string {
  if (prompt.marker && prompt.identifier) {
    const resolved = resolveSillyTavernMarker(prompt.identifier, context);
    if (resolved.handled) {
      markerHits.push(prompt.identifier);
      return resolved.content;
    }
  }

  if (typeof prompt.content !== "string") return "";
  return applyCommonSillyTavernMacros(prompt.content, context);
}

function mapRole(role: SillyTavernPrompt["role"]): ChatMessage["role"] {
  if (role === "system") return "system";
  if (role === "assistant" || role === "model") return "assistant";
  return "user";
}

function pushMergedMessage(messages: ChatMessage[], message: ChatMessage): void {
  if (!message.content.trim()) return;
  const last = messages[messages.length - 1];
  if (last && last.role === message.role) {
    last.content = `${last.content}\n\n${message.content}`;
    return;
  }
  messages.push(message);
}

