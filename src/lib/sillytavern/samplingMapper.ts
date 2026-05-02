import type { SamplingParams } from "@/types/preset";
import type { SillyTavernChatCompletionPreset } from "./presetTypes";

export type SamplingMapperOptions = {
  maxTokensCap?: number;
  defaultTemperature?: number;
};

const DEFAULT_MAX_TOKENS_CAP = 4000;

export function mapSillyTavernSampling(
  preset: SillyTavernChatCompletionPreset,
  options: SamplingMapperOptions = {},
): SamplingParams {
  const maxTokensCap = options.maxTokensCap ?? DEFAULT_MAX_TOKENS_CAP;
  const sourceMaxTokens =
    numberOrUndefined(preset.openai_max_tokens) ??
    numberOrUndefined(preset.max_tokens) ??
    numberOrUndefined(preset.max_new_tokens);

  const sampling: SamplingParams = {
    temperature: clamp(
      numberOrUndefined(preset.temperature) ?? options.defaultTemperature ?? 0.9,
      0,
      2,
    ),
  };

  const topP = numberOrUndefined(preset.top_p);
  if (topP !== undefined) sampling.top_p = clamp(topP, 0, 1);

  const topK = numberOrUndefined(preset.top_k);
  if (topK !== undefined) sampling.top_k = Math.max(0, Math.round(topK));

  const presencePenalty = numberOrUndefined(preset.presence_penalty);
  if (presencePenalty !== undefined) sampling.presence_penalty = presencePenalty;

  const frequencyPenalty = numberOrUndefined(preset.frequency_penalty);
  if (frequencyPenalty !== undefined) sampling.frequency_penalty = frequencyPenalty;

  if (sourceMaxTokens !== undefined) {
    sampling.max_tokens = clamp(Math.round(sourceMaxTokens), 200, maxTokensCap);
  }

  return sampling;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

