import type { Lorebook, LoreEntry } from "@/types/lorebook";
import type { RagEntry, RagEntryKind } from "@/types/rag";
import { resolveEntityIdsFromText } from "./entityResolver";

export function loreToRagEntries(lorebook: Lorebook): RagEntry[] {
  return lorebook.entries.map((entry, index) => loreEntryToRagEntry(entry, lorebook.name, index));
}

function loreEntryToRagEntry(entry: LoreEntry, lorebookName: string, index: number): RagEntry {
  const title = entry.name ?? entry.keys[0] ?? `世界书条目 ${index + 1}`;
  const aliases = [...entry.keys, ...(entry.secondary_keys ?? [])];
  const extensionEntityIds = readStringArray(entry.extensions?.entityIds);
  const entityIds = extensionEntityIds.length > 0
    ? extensionEntityIds
    : resolveEntityIdsFromText([title, aliases.join(" "), entry.content].join("\n"));

  return {
    id: `lore_${slug(lorebookName)}_${index}`,
    title,
    content: entry.content,
    kind: inferLoreKind(title, entry.content),
    source: { type: "lorebook", id: lorebookName },
    enabled: entry.enabled,
    constant: entry.constant,
    entityIds,
    aliases,
    locationTags: readStringArray(entry.extensions?.locationTags ?? entry.extensions?.tags),
    identityGate: entry.extensions?.identity_gate,
    chainId: entry.extensions?.chain_id,
    priority: entry.insertion_order ?? entry.priority ?? 50,
    position: entry.position,
  };
}

function inferLoreKind(title: string, content: string): RagEntryKind {
  const text = `${title}\n${content}`;
  if (/(阿虚|凉宫春日|长门|朝比奈|古泉|朝仓|谷口|国木田|鹤屋|佐佐木)/.test(text)) {
    return "character_profile";
  }
  if (/(教室|北高|部室|公寓|车站|咖啡店|学校|校内|地点)/.test(text)) {
    return "location";
  }
  if (/(事件|大会|消失|孤岛|闭锁空间|七夕|文化祭)/.test(text)) {
    return "canon_event";
  }
  if (/(SOS|机关|组织|思念体|未来人)/.test(text)) {
    return "organization";
  }
  return "world_rule";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function slug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{Letter}\p{Number}_-]/gu, "");
}
