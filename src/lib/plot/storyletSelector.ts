import { storylets } from "@/data/storylets";
import type { BlandnessReport } from "./blandness";
import type { StoryletNode } from "@/types/storylet";
import type { WorldState } from "@/types/worldState";
import { resolveEntityIdsFromText } from "@/lib/rag/entityResolver";

export type SelectStoryletOptions = {
  state: WorldState;
  userInput: string;
  sceneCast?: string;
  blandness: BlandnessReport;
};

export function selectStoryletForTurn(options: SelectStoryletOptions): StoryletNode | undefined {
  const sceneEntities = resolveEntityIdsFromText(options.sceneCast);
  const inputEntities = resolveEntityIdsFromText(options.userInput);
  const entities = new Set([...sceneEntities, ...inputEntities]);

  const candidates = storylets
    .filter((storylet) => passesStoryletGates(storylet, options.state, entities))
    .map((storylet) => ({
      storylet,
      score: scoreStorylet(storylet, options),
    }))
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.storylet;
}

function passesStoryletGates(storylet: StoryletNode, state: WorldState, entities: Set<string>): boolean {
  if (storylet.identityGate && !storylet.identityGate.includes(state.identity)) return false;
  if (storylet.requiredFlags && !storylet.requiredFlags.every((flag) => state.flags.includes(flag))) return false;
  if (storylet.blockedFlags && storylet.blockedFlags.some((flag) => state.flags.includes(flag))) return false;
  if (storylet.requiredCharacters && !storylet.requiredCharacters.every((id) => entities.has(id))) return false;
  if (storylet.dateWindow) {
    if (storylet.dateWindow.from && state.date.iso < storylet.dateWindow.from) return false;
    if (storylet.dateWindow.to && state.date.iso > storylet.dateWindow.to) return false;
  }
  return true;
}

function scoreStorylet(storylet: StoryletNode, options: SelectStoryletOptions): number {
  let score = storylet.priority;
  if (options.blandness.suggestedTiers.includes(storylet.tier as never)) {
    score += Math.round(options.blandness.score * 0.6);
  }
  if (storylet.ragHints?.forceEntityIds?.some((id) => options.userInput.includes(id))) {
    score += 10;
  }
  if (storylet.tier === "anomaly" && options.state.identity === "passerby") {
    score -= 999;
  }
  return score;
}
