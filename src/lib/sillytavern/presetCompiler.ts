import type { ChatMessage } from "@/types/turn";
import { MINIMAL_EVENT_JSON_CONTRACT } from "@/lib/prompting/outputContract";
import { mapSillyTavernSampling } from "./samplingMapper";
import {
  resolveSillyTavernMarker,
  type MarkerResolverContext,
} from "./markerResolver";
import { applySillyTavernMacros, createMacroState, type SillyTavernMacroState } from "./macroEngine";
import { selectSillyTavernPromptOrder } from "./promptOrderSelector";
import {
  applySillyTavernRegexScripts,
  SILLYTAVERN_REGEX_PLACEMENT,
} from "./regexEngine";
import type {
  SillyTavernChatCompletionPreset,
  SillyTavernCompiledPrompt,
  SillyTavernPrompt,
} from "./presetTypes";

export type SillyTavernPresetCompileOptions = {
  presetName?: string;
  preferredCharacterId?: number;
  maxTokensCap?: number;
  outputMode?: "event-json" | "natural";
  appendOutputContract?: boolean;
  applyUserInputRegex?: boolean;
  extraRegexHits?: string[];
  /**
   * 末位硬约束块——在 JSON contract 之后追加为最后一条 system 消息，
   * 占据 LLM 注意力最强位置。用于绕过"lost in the middle"，让 canon focus、
   * 节奏 Tier、未触发 canon 禁区等硬约束确实被遵守。
   */
  lateHardConstraints?: string;
};

export function compileSillyTavernPresetPrompt(opts: {
  preset: SillyTavernChatCompletionPreset;
  markerContext: MarkerResolverContext;
  options?: SillyTavernPresetCompileOptions;
}): SillyTavernCompiledPrompt {
  const { preset, options } = opts;
  const warnings: string[] = [];
  const markerHits: string[] = [];
  const skippedPrompts: string[] = [];
  const prompts = Array.isArray(preset.prompts) ? preset.prompts : [];
  const promptById = new Map<string, SillyTavernPrompt>();
  const shouldApplyInputRegex = options?.applyUserInputRegex !== false;
  const userInputRegex = shouldApplyInputRegex
    ? applySillyTavernRegexScripts(
        opts.markerContext.currentUserInput,
        preset.extensions?.regex_scripts,
        SILLYTAVERN_REGEX_PLACEMENT.USER_INPUT,
        { depth: 0 },
      )
    : { text: opts.markerContext.currentUserInput, applied: [], warnings: [] };
  const markerContext: MarkerResolverContext = {
    ...opts.markerContext,
    currentUserInput: userInputRegex.text,
  };
  warnings.push(...userInputRegex.warnings);
  const macroState = createMacroState();

  for (const prompt of prompts) {
    if (prompt.identifier) promptById.set(prompt.identifier, prompt);
  }

  const orderSelection = selectSillyTavernPromptOrder(preset.prompt_order, {
    preferredCharacterId: options?.preferredCharacterId,
  });
  const order = orderSelection.order;
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

    const compiled = compilePrompt(prompt, markerContext, markerHits, macroState);
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

  if (options?.appendOutputContract !== false) {
    pushMergedMessage(messages, {
      role: "system",
      content: MINIMAL_EVENT_JSON_CONTRACT,
    });
  }

  // 末位硬约束放在 JSON contract 之后——也就是 LLM 看到的最后一条 system 上下文。
  // 这是 prompt 中注意力最强的位置，用来确保 canon focus / 节奏 Tier / 未触发 canon 禁区
  // 真的被遵守，绕过 worldInfo 中段被忽视的"lost in the middle"问题。
  if (options?.lateHardConstraints && options.lateHardConstraints.trim()) {
    pushMergedMessage(messages, {
      role: "system",
      content: options.lateHardConstraints.trim(),
    });
  }

  const sampling = mapSillyTavernSampling(preset, { maxTokensCap: options?.maxTokensCap });
  const presetName = options?.presetName || preset.name || "SillyTavern Preset";
  const outputMode = options?.outputMode ?? "event-json";

  return {
    messages,
    sampling,
    trace: {
      mode: outputMode === "natural" ? "sillytavern-preset-natural" : "sillytavern-preset",
      presetName,
      outputMode,
      promptOrderCharacterId: order?.character_id,
      promptOrderSource: orderSelection.source,
      enabledPromptCount: orderedItems.length,
      markerHits,
      macroHits: macroState.hits,
      macroVariables: Object.keys(macroState.variables),
      unresolvedMacros: macroState.unresolved,
      regexHits: [...new Set([...(options?.extraRegexHits ?? []), ...userInputRegex.applied])],
      skippedPrompts,
      warnings: [...warnings, ...macroState.warnings],
      messageCount: messages.length,
      sampling,
    },
  };
}

function compilePrompt(
  prompt: SillyTavernPrompt,
  context: MarkerResolverContext,
  markerHits: string[],
  macroState: SillyTavernMacroState,
): string {
  if (prompt.marker && prompt.identifier) {
    const resolved = resolveSillyTavernMarker(prompt.identifier, context);
    if (resolved.handled) {
      markerHits.push(prompt.identifier);
      return applySillyTavernMacros(resolved.content, context, macroState, { allowSetVar: false });
    }
  }

  if (typeof prompt.content !== "string") return "";
  return applySillyTavernMacros(prompt.content, context, macroState, { allowSetVar: true });
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

