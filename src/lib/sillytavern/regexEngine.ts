import type { StoryTurn } from "@/types/turn";
import type { SillyTavernRegexScript } from "./presetTypes";

export const SILLYTAVERN_REGEX_PLACEMENT = {
  USER_INPUT: 1,
  AI_OUTPUT: 2,
} as const;

export type RegexApplyResult = {
  text: string;
  applied: string[];
  warnings: string[];
};

export function applySillyTavernRegexScripts(
  text: string,
  scripts: SillyTavernRegexScript[] | undefined,
  placement: number,
  opts: { depth?: number } = {},
): RegexApplyResult {
  if (!text || !Array.isArray(scripts) || scripts.length === 0) {
    return { text, applied: [], warnings: [] };
  }

  let next = text;
  const applied: string[] = [];
  const warnings: string[] = [];
  const depth = opts.depth ?? 0;

  for (const script of scripts) {
    if (!shouldRunScript(script, placement, depth)) continue;
    const parsed = parseRegex(script.findRegex);
    if (!parsed.regex) {
      warnings.push(`${script.scriptName ?? "(unnamed regex)"}: ${parsed.warning}`);
      continue;
    }
    next = next.replace(parsed.regex, typeof script.replaceString === "string" ? script.replaceString : "");
    applied.push(script.scriptName ?? "(unnamed regex)");
  }

  return { text: next.trim(), applied, warnings };
}

export function applySillyTavernRegexToTurn(
  turn: StoryTurn,
  scripts: SillyTavernRegexScript[] | undefined,
  opts: { depth?: number } = {},
): { turn: StoryTurn; applied: string[]; warnings: string[] } {
  const allApplied = new Set<string>();
  const warnings: string[] = [];
  const clean = (value: string): string => {
    const result = applySillyTavernRegexScripts(
      value,
      scripts,
      SILLYTAVERN_REGEX_PLACEMENT.AI_OUTPUT,
      opts,
    );
    result.applied.forEach((name) => allApplied.add(name));
    warnings.push(...result.warnings);
    return result.text;
  };

  return {
    turn: {
      ...turn,
      eventTitle: clean(turn.eventTitle),
      scene: clean(turn.scene),
      time: clean(turn.time),
      mood: clean(turn.mood),
      narration: clean(turn.narration),
      dialogue: turn.dialogue.map((line) => ({
        speaker: clean(line.speaker),
        mood: line.mood ? clean(line.mood) : undefined,
        text: clean(line.text),
      })),
      choices: turn.choices.map(clean).filter(Boolean),
    },
    applied: [...allApplied],
    warnings,
  };
}

function shouldRunScript(script: SillyTavernRegexScript, placement: number, depth: number): boolean {
  if (script.disabled) return false;
  if (typeof script.findRegex !== "string" || !script.findRegex) return false;
  if (!scriptHasPlacement(script, placement)) return false;

  const minDepth = numberOrNull(script.minDepth);
  const maxDepth = numberOrNull(script.maxDepth);
  if (minDepth !== null && depth < minDepth) return false;
  if (maxDepth !== null && depth > maxDepth) return false;

  return true;
}

function scriptHasPlacement(script: SillyTavernRegexScript, placement: number): boolean {
  const placements = script.placement;
  if (!Array.isArray(placements)) return false;
  return placements.some((value) => Number(value) === placement);
}

function parseRegex(source: unknown): { regex: RegExp | null; warning: string } {
  if (typeof source !== "string" || !source) {
    return { regex: null, warning: "missing findRegex" };
  }

  try {
    const literal = source.match(/^\/([\s\S]*)\/([dgimsuvy]*)$/);
    if (literal) {
      return { regex: new RegExp(literal[1], dedupeFlags(literal[2])), warning: "" };
    }
    return { regex: new RegExp(source, "g"), warning: "" };
  } catch (e) {
    return { regex: null, warning: e instanceof Error ? e.message : String(e) };
  }
}

function dedupeFlags(flags: string): string {
  return [...new Set(flags.split(""))].join("");
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
