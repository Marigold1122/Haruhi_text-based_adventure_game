import { selectLoreEntries } from "@/lib/promptRouter";
import type { CharacterBookEntry, CharacterCardV2 } from "@/types/character";
import type { Lorebook, LoreEntry } from "@/types/lorebook";
import type { EventPresetKind, SamplingParams } from "@/types/preset";
import type { ChatMessage } from "@/types/turn";
import type { WorldState } from "@/types/worldState";
import type { SillyTavernChatCompletionPreset, SillyTavernRegexScript } from "@/lib/sillytavern/presetTypes";
import { compileSillyTavernPresetPrompt } from "@/lib/sillytavern/presetCompiler";
import {
  applySillyTavernRegexScripts,
  SILLYTAVERN_REGEX_PLACEMENT,
} from "@/lib/sillytavern/regexEngine";
import { buildLegacyPrompt } from "./legacyPromptEngine";
import { filterLoreForSillyTavernPresetMode } from "./conflictPolicy";
import { renderRuntimeWorldInfo } from "./runtimeContext";
import { buildSillyTavernNaturalPrompt } from "./stNaturalPromptEngine";
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
  if (input.mode === "legacy" || !input.stPreset) {
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
  const worldInfoRegexHits: string[] = [];
  const worldInfoRegexWarnings: string[] = [];
  const regexScripts = input.stPreset.extensions?.regex_scripts;
  const runtimeWorldInfo = renderRuntimeWorldInfo({
    state: input.state,
    sceneCast: input.sceneCast,
    timelineContext: input.timelineContext,
    identityGuide: input.identityGuide,
  });

  const markerContext = {
    card: input.card,
    history: input.history,
    currentUserInput: input.userInput,
    worldInfoBefore: renderLoreEntries(loreBefore, regexScripts, worldInfoRegexHits, worldInfoRegexWarnings),
    worldInfoAfter: [
      renderLoreEntries(loreAfter, regexScripts, worldInfoRegexHits, worldInfoRegexWarnings),
      runtimeWorldInfo,
    ].filter(Boolean).join("\n\n"),
    personaDescription: renderPersonaDescription(input.card),
    userName: "User",
  };
  const activeLoreEntries = filtered.entries.map((entry) => entry.name ?? entry.keys[0] ?? "(unnamed)");

  if (input.mode === "sillytavern-preset-natural") {
    const natural = buildSillyTavernNaturalPrompt({
      preset: input.stPreset,
      presetName: input.stPresetName,
      markerContext,
      activeLoreEntries,
      filteredLoreEntries: filtered.filteredNames,
      worldInfoRegexHits,
    });
    return {
      ...natural,
      trace: {
        ...natural.trace,
        warnings: [...(natural.trace.warnings ?? []), ...worldInfoRegexWarnings],
      },
    };
  }

  const compiled = compileSillyTavernPresetPrompt({
    preset: input.stPreset,
    markerContext,
    options: {
      presetName: input.stPresetName,
      extraRegexHits: worldInfoRegexHits,
    },
  });

  return {
    messages: compiled.messages,
    sampling: compiled.sampling,
    trace: {
      ...compiled.trace,
      activeLoreEntries,
      filteredLoreEntries: filtered.filteredNames,
      warnings: [...(compiled.trace.warnings ?? []), ...worldInfoRegexWarnings],
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

function renderLoreEntries(
  entries: LoreEntry[],
  regexScripts: SillyTavernRegexScript[] | undefined,
  regexHits: string[],
  regexWarnings: string[],
): string {
  return entries.map((entry) => {
    const title = entry.name || entry.keys[0] || "Entry";
    const regexed = applySillyTavernRegexScripts(
      entry.content,
      regexScripts,
      SILLYTAVERN_REGEX_PLACEMENT.WORLD_INFO,
      { depth: 0 },
    );
    regexed.applied.forEach((name) => {
      if (!regexHits.includes(name)) regexHits.push(name);
    });
    regexWarnings.push(...regexed.warnings);
    return `# ${title}\n${regexed.text}`;
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

