import type { SamplingParams } from "@/types/preset";
import type { ChatMessage } from "@/types/turn";
import type { SillyTavernChatCompletionPreset } from "@/lib/sillytavern/presetTypes";
import { compileSillyTavernPresetPrompt } from "@/lib/sillytavern/presetCompiler";
import {
  applySillyTavernRegexScripts,
  SILLYTAVERN_REGEX_PLACEMENT,
} from "@/lib/sillytavern/regexEngine";
import type { MarkerResolverContext } from "@/lib/sillytavern/markerResolver";
import { renderNaturalChatHistory } from "./naturalHistory";
import type { PromptBuildTrace } from "./types";

export type StNaturalPromptInput = {
  preset: SillyTavernChatCompletionPreset;
  presetName?: string;
  markerContext: MarkerResolverContext;
  activeLoreEntries: string[];
  filteredLoreEntries: string[];
  worldInfoRegexHits?: string[];
  lateHardConstraints?: string;
};

export type StNaturalPromptOutput = {
  messages: ChatMessage[];
  sampling: SamplingParams;
  trace: PromptBuildTrace;
};

export function buildSillyTavernNaturalPrompt(input: StNaturalPromptInput): StNaturalPromptOutput {
  const userInputRegex = applySillyTavernRegexScripts(
    input.markerContext.currentUserInput,
    input.preset.extensions?.regex_scripts,
    SILLYTAVERN_REGEX_PLACEMENT.USER_INPUT,
    { depth: 0 },
  );
  const markerContext: MarkerResolverContext = {
    ...input.markerContext,
    currentUserInput: userInputRegex.text,
    historyText: renderNaturalChatHistory({
      history: input.markerContext.history,
      currentUserInput: userInputRegex.text,
      userName: input.markerContext.userName,
      assistantName: input.markerContext.card.data.name,
    }),
  };

  const compiled = compileSillyTavernPresetPrompt({
    preset: input.preset,
    markerContext,
    options: {
      presetName: input.presetName,
      outputMode: "natural",
      appendOutputContract: false,
      applyUserInputRegex: false,
      maxTokensCap: 8000,
      extraRegexHits: [
        ...userInputRegex.applied,
        ...(input.worldInfoRegexHits ?? []),
      ],
      lateHardConstraints: input.lateHardConstraints,
    },
  });

  const messages = [
    ...compiled.messages,
    {
      role: "user" as const,
      content: [
        "继续正文。",
        "遵守上文 preset、资料、互动历史和最新互动；不要输出 JSON、Markdown、解释或项目字段。",
      ].join("\n"),
    },
  ];

  return {
    messages,
    sampling: compiled.sampling,
    trace: {
      ...compiled.trace,
      activeLoreEntries: input.activeLoreEntries,
      filteredLoreEntries: input.filteredLoreEntries,
      outputMode: "natural",
      adapterMode: "rule",
      warnings: [...compiled.trace.warnings, ...userInputRegex.warnings],
      messageCount: messages.length,
    },
  };
}
