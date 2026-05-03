import type { CharacterCardV2 } from "@/types/character";
import type { RagEntry, RagEntrySource } from "@/types/rag";
import { getEntityAliases, getEntityDisplayName } from "./entityResolver";

export type CardToRagOptions = {
  entityId?: string;
  cardId?: string;
  sourceType?: Extract<RagEntrySource["type"], "player_card" | "character_card">;
};

export function cardToRagEntries(card: CharacterCardV2, options: CardToRagOptions = {}): RagEntry[] {
  const data = card.data;
  const entityId = options.entityId ?? stableId(data.name);
  const cardId = options.cardId ?? entityId;
  const sourceType = options.sourceType ?? "character_card";
  const source: RagEntrySource = { type: sourceType, id: cardId };
  const aliases = unique([data.name, getEntityDisplayName(entityId), ...getEntityAliases(entityId)]);
  const entityIds = sourceType === "player_card" ? [cardId] : [entityId];

  const profile = compactJoin([
    `${data.name}：${clip(cleanCardText(data.description), 900)}`,
    data.personality ? `性格摘记：${clip(cleanCardText(data.personality), 360)}` : "",
  ]);
  const voiceSection = extractLikelyVoiceSection(data.description);
  const voice = compactJoin([
    voiceSection ? `说话方式：${clip(cleanCardText(voiceSection), 700)}` : "",
    data.mes_example ? `对话参考：${clip(cleanCardText(data.mes_example), 520)}` : "",
  ]);
  const scenario = compactJoin([
    data.scenario ? `场景 / 背景：${clip(cleanCardText(data.scenario), 520)}` : "",
    data.creator_notes ? `作者备注：${clip(cleanCardText(data.creator_notes), 360)}` : "",
  ]);

  const entries: RagEntry[] = [
    {
      id: `${sourceType === "player_card" ? "player" : "char"}_${cardId}_profile`,
      title: `${data.name} · 核心资料`,
      content: profile,
      kind: sourceType === "player_card" ? "pov" : "character_profile",
      source,
      entityIds,
      aliases,
      priority: sourceType === "player_card" ? 100 : 95,
      tokenBudgetHint: 420,
      position: "after_char",
    },
    {
      id: `${sourceType === "player_card" ? "player" : "char"}_${cardId}_voice`,
      title: `${data.name} · 语气与对白`,
      content: voice || clip(cleanCardText(data.personality), 520),
      kind: "character_voice",
      source,
      entityIds,
      aliases,
      priority: sourceType === "player_card" ? 70 : 82,
      tokenBudgetHint: 360,
      position: "after_char",
    },
    {
      id: `${sourceType === "player_card" ? "player" : "char"}_${cardId}_scenario`,
      title: `${data.name} · 当前背景`,
      content: scenario,
      kind: "character_memory",
      source,
      entityIds,
      aliases,
      priority: 45,
      tokenBudgetHint: 260,
      position: "after_char",
    },
  ];

  return entries.filter((entry) => entry.content.trim().length > 0);
}

function extractLikelyVoiceSection(text: string): string {
  const names = ["说话方式", "语言特征", "称呼习惯", "对话示例"];
  const starts = names
    .map((name) => ({ name, index: text.indexOf(`<${name}>`) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  if (starts.length === 0) return "";
  const start = starts[0];
  const close = `</${start.name}>`;
  const closeIndex = text.indexOf(close, start.index);
  if (closeIndex >= 0) return text.slice(start.index, closeIndex + close.length);
  return text.slice(start.index, start.index + 2200);
}

function cleanCardText(text: string): string {
  return text
    .replace(/<START>/g, "\n")
    .replace(/\{\{char\}\}/g, "角色")
    .replace(/\{\{user\}\}/g, "玩家")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}...`;
}

function compactJoin(parts: string[]): string {
  return parts.filter((part) => part.trim().length > 0).join("\n");
}

function stableId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{Letter}\p{Number}_-]/gu, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
