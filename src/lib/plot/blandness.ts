import type { ChatMessage, StoryTurn } from "@/types/turn";

export type BlandnessReport = {
  score: number;
  reasons: string[];
  suggestedTiers: Array<"micro" | "relationship" | "rumor" | "anomaly">;
};

export function calculateBlandness(history: ChatMessage[]): BlandnessReport {
  const recentTurns = history
    .map((message) => message.parsed)
    .filter((turn): turn is StoryTurn => Boolean(turn))
    .slice(-4);
  const reasons: string[] = [];
  let score = 0;

  if (recentTurns.length === 0) {
    return { score: 20, reasons: ["新场景开端，平淡度使用轻量默认值。"], suggestedTiers: ["micro"] };
  }

  const noRelation = recentTurns.every((turn) => (turn.stateChanges.relationUpdates ?? []).length === 0);
  const noFacts = recentTurns.every((turn) =>
    (turn.stateChanges.addFlags ?? []).length === 0 &&
    (turn.stateChanges.addClues ?? []).length === 0
  );
  const noChoiceVariety = recentTurns.every((turn) => choicesLookPassive(turn.choices));
  const lowAction = recentTurns.every((turn) => textLooksPassive(turnText(turn)));
  const samePace = recentTurns.length >= 3 && recentTurns.every((turn) => turn.pace === "scene");

  if (recentTurns.length >= 2 && noRelation) {
    score += 18;
    reasons.push("最近没有关系变化。");
  }
  if (recentTurns.length >= 2 && noFacts) {
    score += 18;
    reasons.push("最近没有新 flag 或线索。");
  }
  if (noChoiceVariety) {
    score += 14;
    reasons.push("最近选项偏观察或等待。");
  }
  if (lowAction) {
    score += 16;
    reasons.push("最近文本动作后果偏弱。");
  }
  if (samePace) {
    score += 8;
    reasons.push("连续场景推进，需要一个明确小钩子。");
  }

  const hasDialogue = recentTurns.some((turn) =>
    Boolean(turn.speaker) || turn.blocks?.some((block) => block.type === "dialogue")
  );
  if (hasDialogue) score -= 10;

  const hasChoice = recentTurns.some((turn) => turn.requiresChoice && turn.choices.length >= 2);
  if (hasChoice) score -= 6;

  const bounded = Math.max(0, Math.min(100, score + 15));
  const suggestedTiers = bounded >= 61
    ? (["micro", "relationship", "rumor"] as const)
    : bounded >= 36
      ? (["micro", "relationship"] as const)
      : (["micro"] as const);

  return {
    score: bounded,
    reasons: reasons.length > 0 ? reasons : ["最近仍有推进，不需要强干预。"],
    suggestedTiers: [...suggestedTiers],
  };
}

function choicesLookPassive(choices: string[]): boolean {
  if (choices.length === 0) return true;
  const passive = /(继续|观察|看看|等待|环顾|沉默|不动|先听|再说|确认)/;
  return choices.every((choice) => passive.test(choice));
}

function textLooksPassive(text: string): boolean {
  const active = /(走向|开口|递给|拉住|追上|打断|询问|拒绝|答应|拿起|推开|离开|跟上|记住|改变|发现|塞进|拍桌|回头)/;
  return !active.test(text);
}

function turnText(turn: StoryTurn): string {
  const blockText = turn.blocks?.map((block) => block.text).join("\n") ?? "";
  return [turn.narration, blockText, turn.choices.join("\n")].join("\n");
}
