import type { IdentityLevel } from "./lorebook";

export type RagEntryKind =
  | "pov"
  | "character_profile"
  | "character_voice"
  | "character_memory"
  | "location"
  | "organization"
  | "canon_event"
  | "storylet"
  | "arc_stage"
  | "world_rule"
  | "runtime";

export type RagEntryPosition = "before_char" | "after_char" | "author_note";

export type RagEntrySource =
  | { type: "player_card"; id: string }
  | { type: "character_card"; id: string }
  | { type: "lorebook"; id: string }
  | { type: "canon_timeline"; id: string }
  | { type: "event_chain"; id: string }
  | { type: "runtime"; id: string };

export type RelationGate = {
  target: string;
  minTrust?: number;
  maxTrust?: number;
  minAffection?: number;
  maxAffection?: number;
};

export type RagEntry = {
  id: string;
  title: string;
  content: string;
  kind: RagEntryKind;
  source: RagEntrySource;
  enabled?: boolean;
  constant?: boolean;
  entityIds?: string[];
  aliases?: string[];
  locationTags?: string[];
  arcIds?: string[];
  dateWindow?: {
    from?: string;
    to?: string;
    beforeDays?: number;
    afterDays?: number;
  };
  identityGate?: IdentityLevel[];
  chainId?: string;
  flagsRequired?: string[];
  flagsBlocked?: string[];
  relationGate?: RelationGate[];
  priority: number;
  tokenBudgetHint?: number;
  position?: RagEntryPosition;
};

export type RagSelectionReason =
  | "constant"
  | "forced_entity"
  | "forced_entry"
  | "keyword"
  | "budget";

export type SelectedRagEntry = {
  entry: RagEntry;
  reasons: RagSelectionReason[];
};

export type RagSelectionResult = {
  selected: SelectedRagEntry[];
  forcedEntityIds: string[];
  forcedEntryIds: string[];
  droppedByGate: string[];
  droppedByBudget: string[];
};

export type ContentAssetIndex = {
  entries: RagEntry[];
  stats: {
    totalEntries: number;
    npcCardEntries: number;
    loreEntries: number;
    canonEntries: number;
  };
};
