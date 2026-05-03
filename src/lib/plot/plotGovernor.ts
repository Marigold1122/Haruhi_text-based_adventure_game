import type { TriggerDecision } from "@/lib/eventTrigger";
import type { ChatMessage } from "@/types/turn";
import type { PlotDecision } from "@/types/storylet";
import type { WorldState } from "@/types/worldState";
import { calculateBlandness, type BlandnessReport } from "./blandness";
import { selectStoryletForTurn } from "./storyletSelector";

export type GovernTurnOptions = {
  trigger: TriggerDecision;
  state: WorldState;
  history: ChatMessage[];
  userInput: string;
  sceneCast?: string;
};

export type GovernTurnResult = {
  plot: PlotDecision;
  blandness: BlandnessReport;
};

export function governTurn(options: GovernTurnOptions): GovernTurnResult {
  const blandness = calculateBlandness(options.history);

  if (options.trigger.canonFocus) {
    return {
      blandness,
      plot: {
        eventKind: options.trigger.eventKind,
        canonFocus: options.trigger.canonFocus,
        reason: options.trigger.reason,
        intensityTarget: canonIntensity(options.trigger.canonFocus.scope),
        fixedFacts: [
          `本轮取景必须围绕原作节点：${options.trigger.canonFocus.title}。`,
          `客观结果遵循 canonTimeline：${options.trigger.canonFocus.summary}`,
          ...canonSpecificGuards(options.trigger.canonFocus.id),
          "玩家只能改变观察角度、参与方式和人际后果，不改变原作关键事实。",
        ],
        variableOutcomes: [
          "玩家从什么角度进入或旁观该节点。",
          "在场 NPC 是否注意到玩家的反应。",
          "本节点之后玩家关系和线索如何轻微变化。",
        ],
        ragHints: {
          forceEntityIds: [],
          forceLocationTags: options.trigger.canonFocus.location ? [options.trigger.canonFocus.location] : [],
          forceEntryIds: [`canon_${options.trigger.canonFocus.id}`],
        },
      },
    };
  }

  const activeStorylet = selectStoryletForTurn({
    state: options.state,
    userInput: options.userInput,
    sceneCast: options.sceneCast,
    blandness,
  });

  return {
    blandness,
    plot: {
      eventKind: options.trigger.eventKind,
      activeStorylet,
      reason: activeStorylet
        ? `storylet selected: ${activeStorylet.id}; trigger=${options.trigger.reason}; blandness=${blandness.score}`
        : `no storylet matched; trigger=${options.trigger.reason}; blandness=${blandness.score}`,
      intensityTarget: activeStorylet?.intensity ?? (blandness.score >= 61 ? 35 : 22),
      fixedFacts: activeStorylet?.fixedFacts ?? [
        "保持当前世界状态，不跳过原作时间线。",
        "不要凭空制造大事件；若无明确节点，就让一个小后果回应玩家选择。",
      ],
      variableOutcomes: activeStorylet?.variableOutcomes ?? [
        "让某个在场角色给出一句或一个动作回应。",
        "结尾提供有差异的下一步选择。",
      ],
      ragHints: {
        forceEntityIds: activeStorylet?.ragHints?.forceEntityIds ?? [],
        forceLocationTags: activeStorylet?.ragHints?.forceLocationTags ?? [],
        forceEntryIds: activeStorylet?.ragHints?.forceEntryIds ?? [],
      },
    },
  };
}

function canonIntensity(scope: "small" | "medium" | "large"): number {
  if (scope === "large") return 70;
  if (scope === "medium") return 52;
  return 34;
}

function canonSpecificGuards(canonEventId: string): string[] {
  if (canonEventId !== "entrance_day_declaration") return [];
  return [
    "春日的宣言发生在一年五班班会的自我介绍环节，不是在入学典礼麦克风前。",
    "春日座位在阿虚正后方；不要写成前排、第三排或远离阿虚的位置。",
    "阿虚、春日、谷口、国木田、朝仓凉子在一年五班；长门不在一年五班；朝比奈是二年级；古泉尚未转入。",
  ];
}
