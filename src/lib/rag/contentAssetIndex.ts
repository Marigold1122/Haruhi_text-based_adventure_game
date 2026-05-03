import { canonTimeline } from "@/data/canonTimeline";
import { npcReferenceCards } from "@/data/characters";
import type { CharacterCardV2 } from "@/types/character";
import type { Lorebook } from "@/types/lorebook";
import type { ContentAssetIndex, RagEntry } from "@/types/rag";
import { canonToRagEntries } from "./canonToRagEntries";
import { cardToRagEntries } from "./cardToRagEntries";
import { loreToRagEntries } from "./loreToRagEntries";

export type BuildContentAssetIndexOptions = {
  playerCard?: CharacterCardV2;
  lorebook?: Lorebook;
  includeNpcCards?: boolean;
  includeCanon?: boolean;
};

export function buildContentAssetIndex(options: BuildContentAssetIndexOptions): ContentAssetIndex {
  const entries: RagEntry[] = [];

  if (options.playerCard) {
    entries.push(...cardToRagEntries(options.playerCard, {
      cardId: options.playerCard.data.name,
      sourceType: "player_card",
    }));
  }

  if (options.includeNpcCards) {
    for (const [entityId, card] of Object.entries(npcReferenceCards)) {
      entries.push(...cardToRagEntries(card, {
        entityId,
        cardId: entityId,
        sourceType: "character_card",
      }));
    }
  }

  if (options.lorebook) {
    entries.push(...loreToRagEntries(options.lorebook));
  }

  if (options.includeCanon) {
    entries.push(...canonToRagEntries(canonTimeline));
  }

  return {
    entries,
    stats: {
      totalEntries: entries.length,
      npcCardEntries: entries.filter((entry) => entry.source.type === "character_card").length,
      loreEntries: entries.filter((entry) => entry.source.type === "lorebook").length,
      canonEntries: entries.filter((entry) => entry.source.type === "canon_timeline").length,
    },
  };
}
