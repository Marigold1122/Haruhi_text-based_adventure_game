import type { WorldState } from "@/types/worldState";
import type { RagEntry, RagEntryKind, RagSelectionReason, RagSelectionResult, SelectedRagEntry } from "@/types/rag";
import { resolvePresentEntityIdsFromSceneCast } from "./entityResolver";

export type SelectRagEntriesOptions = {
  entries: RagEntry[];
  state: WorldState;
  scanText: string;
  sceneCast?: string;
  forceEntityIds?: string[];
  forceEntryIds?: string[];
  includeKinds?: RagEntryKind[];
  maxEntries?: number;
  maxEntriesPerEntity?: number;
};

export function selectRagEntries(options: SelectRagEntriesOptions): RagSelectionResult {
  const forcedEntityIds = unique([
    ...resolvePresentEntityIdsFromSceneCast(options.sceneCast),
    ...(options.forceEntityIds ?? []),
  ]);
  const forcedEntryIds = new Set(options.forceEntryIds ?? []);
  const includeKinds = new Set(options.includeKinds ?? []);
  const droppedByGate: string[] = [];
  const candidates: SelectedRagEntry[] = [];

  for (const entry of options.entries) {
    if (entry.enabled === false) continue;
    if (includeKinds.size > 0 && !includeKinds.has(entry.kind)) continue;
    if (!passesGates(entry, options.state)) {
      droppedByGate.push(entry.id);
      continue;
    }

    const reasons: RagSelectionReason[] = [];
    if (entry.constant) reasons.push("constant" as const);
    if (forcedEntryIds.has(entry.id)) reasons.push("forced_entry" as const);
    if (intersects(entry.entityIds, forcedEntityIds)) reasons.push("forced_entity" as const);
    if (matchesKeyword(entry, options.scanText)) reasons.push("keyword" as const);
    if (reasons.length > 0) candidates.push({ entry, reasons });
  }

  const sorted = candidates.sort((a, b) => {
    const forcedDelta = Number(hasForcedReason(b)) - Number(hasForcedReason(a));
    if (forcedDelta !== 0) return forcedDelta;
    return b.entry.priority - a.entry.priority;
  });

  const selected: SelectedRagEntry[] = [];
  const droppedByBudget: string[] = [];
  const perEntity = new Map<string, number>();
  const maxEntries = options.maxEntries ?? 8;
  const maxEntriesPerEntity = options.maxEntriesPerEntity ?? 2;

  for (const item of sorted) {
    if (selected.length >= maxEntries) {
      droppedByBudget.push(item.entry.id);
      continue;
    }
    const primaryEntity = item.entry.entityIds?.[0];
    if (primaryEntity) {
      const count = perEntity.get(primaryEntity) ?? 0;
      if (count >= maxEntriesPerEntity) {
        droppedByBudget.push(item.entry.id);
        continue;
      }
      perEntity.set(primaryEntity, count + 1);
    }
    selected.push(item);
  }

  return {
    selected,
    forcedEntityIds,
    forcedEntryIds: [...forcedEntryIds],
    droppedByGate,
    droppedByBudget,
  };
}

export function formatRagEntry(entry: RagEntry): string {
  return `# ${entry.title}\n${entry.content}`;
}

function passesGates(entry: RagEntry, state: WorldState): boolean {
  if (entry.identityGate && !entry.identityGate.includes(state.identity)) return false;
  if (entry.chainId && state.activeChain?.id !== entry.chainId) return false;
  if (entry.flagsRequired && !entry.flagsRequired.every((flag) => state.flags.includes(flag))) return false;
  if (entry.flagsBlocked && entry.flagsBlocked.some((flag) => state.flags.includes(flag))) return false;
  return true;
}

function matchesKeyword(entry: RagEntry, scanText: string): boolean {
  if (!scanText.trim()) return false;
  const lower = scanText.toLowerCase();
  return (entry.aliases ?? []).some((alias) => {
    if (!alias.trim()) return false;
    if (/^[A-Za-z0-9_-]+$/.test(alias)) {
      return lower.includes(alias.toLowerCase());
    }
    return scanText.includes(alias);
  });
}

function hasForcedReason(item: SelectedRagEntry): boolean {
  return item.reasons.includes("forced_entity") || item.reasons.includes("forced_entry");
}

function intersects(left: string[] | undefined, right: string[]): boolean {
  if (!left || left.length === 0 || right.length === 0) return false;
  return left.some((item) => right.includes(item));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
