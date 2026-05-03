import type { SamplingParams } from "@/types/preset";
import type { BlandnessReport } from "@/lib/plot/blandness";

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
  forcedRagEntries?: string[];
  ragStats?: {
    totalCandidates: number;
    selectedCount: number;
    droppedByGate?: string[];
    droppedByBudget?: string[];
    forcedEntityIds?: string[];
  };
  plotDecision?: {
    eventKind: string;
    storyletId?: string;
    canonEventId?: string;
    reason: string;
    intensityTarget: number;
  };
  blandness?: BlandnessReport;
  messageCount?: number;
  sampling?: SamplingParams;
  naturalTextLength?: number;
  adapterMode?: "rule" | "llm" | "parallel-llm";
  styleProfile?: string;
  styleFailures?: string[];
  styleWarnings?: string[];
};

