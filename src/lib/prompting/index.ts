import { selectLoreEntries } from "@/lib/promptRouter";
import type { CharacterBookEntry, CharacterCardV2 } from "@/types/character";
import type { Lorebook, LoreEntry } from "@/types/lorebook";
import type { EventPresetKind, SamplingParams } from "@/types/preset";
import type { ChatMessage } from "@/types/turn";
import type { WorldState } from "@/types/worldState";
import type { SillyTavernChatCompletionPreset } from "@/lib/sillytavern/presetTypes";
import { compileSillyTavernPresetPrompt } from "@/lib/sillytavern/presetCompiler";
import { buildLegacyPrompt } from "./legacyPromptEngine";
import { filterLoreForSillyTavernPresetMode } from "./conflictPolicy";
import { renderRuntimeWorldInfo } from "./runtimeContext";
import type { PromptBuildTrace, PromptMode } from "./types";

export type PromptBuildInput = {
  mode: PromptMode;
  stPreset?: SillyTavernChatCompletionPreset | null;
  stPresetName?: string;
  card: CharacterCardV2;
  lorebook: Lorebook;
  state: WorldState;
  eventKind: EventPresetKind;
  history: ChatMessage[];
  summary?: string | null;
  userInput: string;
  sceneCast?: string;
  timelineContext?: string;
  identityGuide?: string;
};

export type PromptBuildOutput = {
  messages: ChatMessage[];
  sampling: SamplingParams;
  trace: PromptBuildTrace;
};

export function buildPromptForTurn(input: PromptBuildInput): PromptBuildOutput {
  if (input.mode !== "sillytavern-preset" || !input.stPreset) {
    return buildLegacyPrompt(input);
  }

  const scanText = [
    ...input.history.slice(-6).map((m) => m.content),
    input.userInput,
  ].join("\n");

  const combinedLorebook = mergeCardLorebook(input.lorebook, input.card);
  const selectedLore = selectLoreEntries({
    lorebook: combinedLorebook,
    state: input.state,
    scanText,
  });
  const filtered = filterLoreForSillyTavernPresetMode(selectedLore);
  const loreBefore = filtered.entries.filter((entry) => entry.position !== "after_char");
  const loreAfter = filtered.entries.filter((entry) => entry.position === "after_char" || entry.position === undefined);
  const runtimeWorldInfo = renderRuntimeWorldInfo({
    state: input.state,
    sceneCast: input.sceneCast,
    timelineContext: input.timelineContext,
    identityGuide: input.identityGuide,
  });

  const compiled = compileSillyTavernPresetPrompt({
    preset: input.stPreset,
    markerContext: {
      card: input.card,
      history: input.history,
      currentUserInput: input.userInput,
      worldInfoBefore: renderLoreEntries(loreBefore),
      worldInfoAfter: [renderLoreEntries(loreAfter), runtimeWorldInfo].filter(Boolean).join("\n\n"),
      personaDescription: renderPersonaDescription(input.card),
    },
    options: {
      presetName: input.stPresetName,
    },
  });

  return {
    messages: compiled.messages,
    sampling: compiled.sampling,
    trace: {
      ...compiled.trace,
      activeLoreEntries: filtered.entries.map((entry) => entry.name ?? entry.keys[0] ?? "(unnamed)"),
      filteredLoreEntries: filtered.filteredNames,
    },
  };
}

function mergeCardLorebook(lorebook: Lorebook, card: CharacterCardV2): Lorebook {
  const cardEntries = card.data.character_book?.entries ?? [];
  if (cardEntries.length === 0) return lorebook;
  return {
    ...lorebook,
    entries: [
      ...lorebook.entries,
      ...cardEntries.map(convertCharacterBookEntry),
    ],
  };
}

function convertCharacterBookEntry(entry: CharacterBookEntry): LoreEntry {
  return entry as LoreEntry;
}

function renderLoreEntries(entries: LoreEntry[]): string {
  return entries.map((entry) => {
    const title = entry.name || entry.keys[0] || "Entry";
    return `# ${title}\n${entry.content}`;
  }).join("\n\n");
}

function renderPersonaDescription(card: CharacterCardV2): string {
  const lines = [
    `角色名：${card.data.name}`,
    card.data.description,
    card.data.personality,
  ].filter((line) => line.trim());
  return lines.join("\n\n");
}

