import type {
  SillyTavernChatCompletionPreset,
  SillyTavernPresetSummary,
} from "./presetTypes";

export type ParsedSillyTavernPreset = {
  preset: SillyTavernChatCompletionPreset;
  diagnostics: string[];
  summary: SillyTavernPresetSummary;
};

export function parseSillyTavernPresetJson(text: string, fallbackName = "SillyTavern Preset"): ParsedSillyTavernPreset {
  const diagnostics: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`无法解析 SillyTavern preset JSON：${msg}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("SillyTavern preset JSON 顶层必须是对象。");
  }

  const preset = parsed as SillyTavernChatCompletionPreset;
  if (!Array.isArray(preset.prompts)) {
    diagnostics.push("缺少 prompts 数组；只能使用采样参数，无法复现 prompt_order 效果。");
    preset.prompts = [];
  }
  if (!Array.isArray(preset.prompt_order)) {
    diagnostics.push("缺少 prompt_order 数组；将按 prompts 原始顺序编译。");
    preset.prompt_order = [];
  }

  const missingIdentifierCount = preset.prompts.filter((p) => !p.identifier).length;
  if (missingIdentifierCount > 0) {
    diagnostics.push(`${missingIdentifierCount} 条 prompt 缺少 identifier，无法通过 prompt_order 匹配。`);
  }

  return {
    preset,
    diagnostics,
    summary: summarizeSillyTavernPreset(preset, fallbackName),
  };
}

export function summarizeSillyTavernPreset(
  preset: SillyTavernChatCompletionPreset,
  fallbackName = "SillyTavern Preset",
): SillyTavernPresetSummary {
  const promptCount = Array.isArray(preset.prompts) ? preset.prompts.length : 0;
  const promptOrderCount = Array.isArray(preset.prompt_order) ? preset.prompt_order.length : 0;
  const regexScripts = preset.extensions?.regex_scripts;
  const sourceMaxTokens =
    numberOrUndefined(preset.openai_max_tokens) ??
    numberOrUndefined(preset.max_tokens) ??
    numberOrUndefined(preset.max_new_tokens);

  return {
    name: typeof preset.name === "string" && preset.name.trim() ? preset.name : fallbackName,
    promptCount,
    promptOrderCount,
    regexScriptCount: Array.isArray(regexScripts) ? regexScripts.length : 0,
    temperature: numberOrUndefined(preset.temperature),
    topP: numberOrUndefined(preset.top_p),
    sourceMaxTokens,
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

