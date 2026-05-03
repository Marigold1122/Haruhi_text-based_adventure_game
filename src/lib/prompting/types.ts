import type { SamplingParams } from "@/types/preset";

export type PromptMode =
  | "writer-adapter"
  | "legacy"
  | "sillytavern-preset"
  | "sillytavern-preset-natural";

export type PromptOutputMode = "event-json" | "natural" | "two-pass";

export type PromptBuildTrace = {
  mode: PromptMode;
  presetName: string;
  activeLoreEntries: string[];
  authorsNote?: string;
  outputMode?: PromptOutputMode;
  promptOrderCharacterId?: number;
  promptOrderSource?: string;
  enabledPromptCount?: number;
  markerHits?: string[];
  macroHits?: string[];
  macroVariables?: string[];
  unresolvedMacros?: string[];
  regexHits?: string[];
  skippedPrompts?: string[];
  warnings?: string[];
  filteredLoreEntries?: string[];
  messageCount?: number;
  sampling?: SamplingParams;
  naturalTextLength?: number;
  adapterMode?: "rule" | "llm" | "parallel-llm";
  styleProfile?: string;
  styleFailures?: string[];
  styleWarnings?: string[];
};

