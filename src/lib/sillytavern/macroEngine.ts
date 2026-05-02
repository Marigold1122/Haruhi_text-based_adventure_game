import type { MarkerResolverContext } from "./markerResolver";

export type SillyTavernMacroState = {
  variables: Record<string, string>;
  warnings: string[];
  hits: string[];
  unresolved: string[];
};

export type ApplySillyTavernMacroOptions = {
  allowSetVar?: boolean;
};

export function createMacroState(seed: Record<string, string> = {}): SillyTavernMacroState {
  return {
    variables: { ...seed },
    warnings: [],
    hits: [],
    unresolved: [],
  };
}

export function applySillyTavernMacros(
  text: string,
  context: MarkerResolverContext,
  state: SillyTavernMacroState,
  options: ApplySillyTavernMacroOptions = {},
): string {
  let next = text;
  const allowSetVar = options.allowSetVar ?? true;

  next = next.replace(/\{\{\/\/[\s\S]*?\}\}/g, () => {
    addUnique(state.hits, "comment");
    return "";
  });

  next = next.replace(/\{\{setvar::([^:}]+)::([\s\S]*?)\}\}/g, (_match, rawKey: string, rawValue: string) => {
    const key = rawKey.trim();
    if (!key) return "";
    addUnique(state.hits, "setvar");
    if (!allowSetVar) {
      addUnique(state.unresolved, `setvar:${key}`);
      return "";
    }
    state.variables[key] = rawValue;
    return "";
  });

  next = next.replace(/\{\{getvar::([^}]+)\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    addUnique(state.hits, "getvar");
    if (Object.prototype.hasOwnProperty.call(state.variables, key)) {
      return state.variables[key] ?? "";
    }
    addUnique(state.unresolved, `getvar:${key}`);
    return "";
  });

  next = next.replace(/\{\{trim\}\}/g, () => {
    addUnique(state.hits, "trim");
    return "";
  });

  next = replaceSimpleMacros(next, context, state);

  next = next.replace(/\{\{([^}]+)\}\}/g, (_match, rawName: string) => {
    const name = rawName.trim();
    addUnique(state.unresolved, name);
    return "";
  });

  return cleanMacroWhitespace(next);
}

function replaceSimpleMacros(
  text: string,
  context: MarkerResolverContext,
  state: SillyTavernMacroState,
): string {
  const charName = context.card.data.name || "Character";
  const userName = context.userName?.trim() || "User";
  const replacements: Array<[RegExp, string, string]> = [
    [/\{\{user\}\}/g, userName, "user"],
    [/\{\{char\}\}/g, charName, "char"],
    [/\{\{input\}\}/g, context.currentUserInput, "input"],
    [/\{\{lastusermessage\}\}/g, context.currentUserInput, "lastusermessage"],
    [/<USER>/g, userName, "USER"],
    [/<BOT>/g, charName, "BOT"],
  ];

  let next = text;
  for (const [pattern, value, name] of replacements) {
    pattern.lastIndex = 0;
    if (pattern.test(next)) {
      addUnique(state.hits, name);
      pattern.lastIndex = 0;
      next = next.replace(pattern, value);
    }
  }
  return next;
}

function cleanMacroWhitespace(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function addUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}
