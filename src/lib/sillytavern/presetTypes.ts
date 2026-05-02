import type { SamplingParams } from "@/types/preset";
import type { ChatMessage } from "@/types/turn";

export type SillyTavernPromptRole = "system" | "user" | "assistant" | "model";

export type SillyTavernPrompt = {
  identifier?: string;
  name?: string;
  role?: SillyTavernPromptRole | string;
  content?: string;
  marker?: boolean;
  system_prompt?: boolean;
  injection_position?: number | string;
  injection_depth?: number;
  forbid_overrides?: boolean;
  injection_order?: number;
  injection_trigger?: string;
};

export type SillyTavernPromptOrderItem = {
  identifier: string;
  enabled: boolean;
};

export type SillyTavernPromptOrder = {
  character_id?: number;
  order: SillyTavernPromptOrderItem[];
};

export type SillyTavernRegexScript = {
  scriptName?: string;
  disabled?: boolean;
  findRegex?: string;
  replaceString?: string;
  [key: string]: unknown;
};

export type SillyTavernPresetExtensions = {
  regex_scripts?: SillyTavernRegexScript[];
  SPreset?: unknown;
  tavern_helper?: unknown;
  [key: string]: unknown;
};

export type SillyTavernChatCompletionPreset = {
  name?: string;
  prompts?: SillyTavernPrompt[];
  prompt_order?: SillyTavernPromptOrder[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  openai_max_tokens?: number;
  max_tokens?: number;
  max_new_tokens?: number;
  extensions?: SillyTavernPresetExtensions;
  [key: string]: unknown;
};

export type SillyTavernPresetSummary = {
  name: string;
  promptCount: number;
  promptOrderCount: number;
  regexScriptCount: number;
  temperature?: number;
  topP?: number;
  sourceMaxTokens?: number;
};

export type SillyTavernCompileTrace = {
  mode: "sillytavern-preset" | "sillytavern-preset-natural";
  presetName: string;
  outputMode?: "event-json" | "natural";
  promptOrderCharacterId?: number;
  promptOrderSource?: string;
  enabledPromptCount: number;
  markerHits: string[];
  macroHits?: string[];
  macroVariables?: string[];
  unresolvedMacros?: string[];
  regexHits?: string[];
  skippedPrompts: string[];
  warnings: string[];
  messageCount: number;
  sampling: SamplingParams;
};

export type SillyTavernCompiledPrompt = {
  messages: ChatMessage[];
  sampling: SamplingParams;
  trace: SillyTavernCompileTrace;
};

