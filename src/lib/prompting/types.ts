import type { SamplingParams } from "@/types/preset";

export type PromptMode = "legacy" | "sillytavern-preset";

export type PromptBuildTrace = {
  mode: PromptMode;
  presetName: string;
  activeLoreEntries: string[];
  authorsNote?: string;
  promptOrderCharacterId?: number;
  enabledPromptCount?: number;
  markerHits?: string[];
  skippedPrompts?: string[];
  warnings?: string[];
  filteredLoreEntries?: string[];
  messageCount?: number;
  sampling?: SamplingParams;
};

