import { assemblePrompt, pickPreset } from "@/lib/promptRouter";
import type { CharacterCardV2 } from "@/types/character";
import type { Lorebook } from "@/types/lorebook";
import type { EventPresetKind, SamplingParams } from "@/types/preset";
import type { ChatMessage } from "@/types/turn";
import type { WorldState } from "@/types/worldState";
import type { PromptBuildTrace } from "./types";

export type LegacyPromptBuildInput = {
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

export type LegacyPromptBuildOutput = {
  messages: ChatMessage[];
  sampling: SamplingParams;
  trace: PromptBuildTrace;
};

export function buildLegacyPrompt(input: LegacyPromptBuildInput): LegacyPromptBuildOutput {
  const preset = pickPreset({ eventKind: input.eventKind, state: input.state });
  const assembled = assemblePrompt({
    card: input.card,
    lorebook: input.lorebook,
    preset,
    state: input.state,
    history: input.history,
    summary: input.summary,
    userInput: input.userInput,
    sceneCast: input.sceneCast,
    timelineContext: input.timelineContext,
    identityGuide: input.identityGuide,
  });

  return {
    messages: assembled.messages,
    sampling: preset.sampling,
    trace: {
      mode: "legacy",
      presetName: assembled.trace.presetName,
      activeLoreEntries: assembled.trace.activeLoreEntries,
      authorsNote: assembled.trace.authorsNote,
      messageCount: assembled.messages.length,
      sampling: preset.sampling,
    },
  };
}

