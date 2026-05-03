import type { EventPresetKind } from "./preset";
import type { IdentityLevel } from "./lorebook";
import type { CanonEvent } from "@/data/canonTimeline";

export type StoryletTier =
  | "micro"
  | "relationship"
  | "rumor"
  | "arc"
  | "canon"
  | "anomaly";

export type StoryletNode = {
  id: string;
  title: string;
  tier: StoryletTier;
  intensity: number;
  dateWindow?: { from?: string; to?: string };
  identityGate?: IdentityLevel[];
  requiredCharacters?: string[];
  requiredLocationTags?: string[];
  requiredFlags?: string[];
  blockedFlags?: string[];
  requiredClues?: string[];
  relationGate?: Array<{
    target: string;
    minTrust?: number;
    minAffection?: number;
  }>;
  clockGate?: Array<{
    clockId: string;
    min?: number;
    max?: number;
  }>;
  cooldownTurns: number;
  repeatable: boolean;
  priority: number;
  hook: string;
  dramaticQuestion: string;
  conflict: string;
  fixedFacts: string[];
  variableOutcomes: string[];
  stateEffectsHint?: {
    addFlags?: string[];
    addClues?: string[];
    relationTargets?: string[];
    tickClocks?: string[];
  };
  ragHints?: {
    forceEntityIds?: string[];
    forceEntryIds?: string[];
    forceLocationTags?: string[];
  };
};

export type PlotDecision = {
  eventKind: EventPresetKind;
  activeStorylet?: StoryletNode;
  canonFocus?: CanonEvent;
  reason: string;
  intensityTarget: number;
  fixedFacts: string[];
  variableOutcomes: string[];
  ragHints: {
    forceEntityIds: string[];
    forceLocationTags: string[];
    forceEntryIds: string[];
  };
};
