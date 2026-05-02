import type { LoreEntry } from "@/types/lorebook";

const BLOCKED_LORE_NAMES = new Set([
  "原作叙事风味",
  "禁止事项",
]);

export type FilteredLoreResult = {
  entries: LoreEntry[];
  filteredNames: string[];
};

export function filterLoreForSillyTavernPresetMode(entries: LoreEntry[]): FilteredLoreResult {
  const filteredNames: string[] = [];
  const kept = entries.filter((entry) => {
    const name = entry.name?.trim();
    if (name && BLOCKED_LORE_NAMES.has(name)) {
      filteredNames.push(name);
      return false;
    }
    if (entry.content.includes("回复结尾必须") || entry.content.includes("<event_json>...</event_json>")) {
      filteredNames.push(name || entry.keys[0] || "(unnamed output-contract lore)");
      return false;
    }
    return true;
  });

  return { entries: kept, filteredNames };
}

