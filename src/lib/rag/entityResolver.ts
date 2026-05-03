import { entityDefinitions, findEntityDefinition } from "@/data/entities";

export function resolveEntityIdsFromText(text: string | undefined | null): string[] {
  if (!text) return [];
  const hits = new Set<string>();
  for (const entity of entityDefinitions) {
    if (entity.aliases.some((alias) => containsAlias(text, alias))) {
      hits.add(entity.id);
    }
  }
  return [...hits];
}

export function resolvePresentEntityIdsFromSceneCast(sceneCast: string | undefined | null): string[] {
  if (!sceneCast) return [];
  const lines = sceneCast.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const positiveLines: string[] = [];
  const firstPresentLine = lines.find((line) => /^在场[（(]/.test(line));
  if (firstPresentLine && !isNegativeSceneLine(firstPresentLine)) {
    positiveLines.push(firstPresentLine);
  }
  positiveLines.push(...lines.filter((line) => {
    if (isNegativeSceneLine(line)) return false;
    return /(本轮焦点|场景成员)/.test(line);
  }));
  if (positiveLines.length === 0) {
    positiveLines.push(...lines.filter((line) => !isNegativeSceneLine(line)));
  }
  return resolveEntityIdsFromText(positiveLines.join("\n"));
}

export function resolveEntityIdsFromNames(names: string[]): string[] {
  const hits = new Set<string>();
  for (const name of names) {
    resolveEntityIdsFromText(name).forEach((id) => hits.add(id));
  }
  return [...hits];
}

export function getEntityAliases(entityId: string): string[] {
  const entity = findEntityDefinition(entityId);
  return entity ? [entity.displayName, ...entity.aliases] : [];
}

export function getEntityDisplayName(entityId: string): string {
  return findEntityDefinition(entityId)?.displayName ?? entityId;
}

function containsAlias(text: string, alias: string): boolean {
  const trimmed = alias.trim();
  if (!trimmed) return false;
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return text.toLowerCase().includes(trimmed.toLowerCase());
  }
  return text.includes(trimmed);
}

function isNegativeSceneLine(line: string): boolean {
  return /(绝对不在场|不在场|不得出现在|尚未登场)/.test(line);
}
