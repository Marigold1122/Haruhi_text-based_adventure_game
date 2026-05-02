// 结局系统
//
// 设计要点（按 prompt.md 第十二节）：
//   - 替换'死亡'为渐进式'故事终结'
//   - 渐进触发：事件1 → 事件2 概率提升 → 事件3 直接终结
//   - 终结后调用 LLM，喂完整聊天历史 + 完整 pastEvents，生成"小传"

import type { WorldState } from "@/types/worldState";
import type { ChatMessage } from "@/types/turn";
import { runLLMText } from "./llm";

export type EndingType =
  | "graduation"          // 毕业终章
  | "disappearance_stay"  // 消失分支永居
  | "closed_space_loss"   // 闭锁空间牺牲
  | "recovered"           // 被回收
  | "world_reset"         // 世界重置遗忘
  | "sos_dissolved";      // SOS 团解散

export type EndingTrigger = {
  type: EndingType;
  reason: string;
};

// 每轮终结概率：综合春日满足度 / 世界稳定 / 玩家压力 / 时间
export function endingProbability(state: WorldState): { p: number; candidates: EndingType[] } {
  let p = 0;
  const candidates: EndingType[] = [];

  if (state.haruhiSatisfaction <= -70 && state.worldStability <= 30) {
    p += 0.25;
    candidates.push("world_reset");
  }
  if (state.haruhiSatisfaction <= -50) {
    p += 0.05;
    candidates.push("closed_space_loss");
  }
  if (state.playerStress >= 90) {
    p += 0.08;
    candidates.push("sos_dissolved");
  }
  if (state.flags.includes("disappearance_stayed")) {
    p += 0.4;
    candidates.push("disappearance_stay");
  }
  if (state.flags.includes("recovered_by_organization")) {
    p += 0.5;
    candidates.push("recovered");
  }
  // 高三冬季 / 毕业临近：自然结束概率上升
  if (state.flags.includes("graduation")) {
    p += 0.6;
    candidates.push("graduation");
  }
  return { p: Math.min(p, 0.95), candidates };
}

export function rollEnding(state: WorldState, rng: () => number = Math.random): EndingTrigger | null {
  const { p, candidates } = endingProbability(state);
  if (candidates.length === 0) return null;
  if (rng() > p) return null;
  // 从候选中按出现顺序挑第一个
  const type = candidates[0];
  return { type, reason: `triggered with p=${p.toFixed(2)}; candidates=${candidates.join("/")}` };
}

// 调 LLM 喂完整历史生成结局小传
export async function generateEndingNarrative(opts: {
  state: WorldState;
  history: ChatMessage[];
  ending: EndingTrigger;
  characterName: string;
  summary?: string | null;
}): Promise<string> {
  const { state, history, ending, characterName, summary } = opts;

  const intro: ChatMessage = {
    role: "system",
    content: [
      "你是凉宫春日系列校园文字冒险的'盖棺定论'叙事引擎。",
      `本作单视角第一人称——结局小传必须以 ${characterName} 的第一人称（'我'）展开。`,
      `结局类型：${endingLabel(ending.type)}（${ending.reason}）`,
      "请基于以下完整聊天历史与世界状态，写一段 500-900 字的中文结局小传。",
      "格式：分 3-5 段，节奏由近及远——开头落在最近一节场景，中段总结这一段时间发生的事与人，末尾落在主角对未来的看法。",
      "保持原作风味：阿虚=吐槽体；春日=直率高昂；长门=极简但带细微情感流露；朝比奈=温柔慌张；古泉=长句比喻。",
      "禁止：直接报数字状态；让春日突然意识到自己是世界中心；引入未在历史中出现过的人物。",
      "只输出小传正文，不要前置寒暄、不要包 JSON 块。",
      summary ? `\n[过往剧情滚动摘要]\n${summary}` : "",
    ].filter(Boolean).join("\n"),
  };

  const stateBlock: ChatMessage = {
    role: "system",
    content: [
      "[最终世界状态]",
      `· 春日满足度：${state.haruhiSatisfaction}　世界稳定度：${state.worldStability}　玩家压力：${state.playerStress}`,
      `· 当前日期：${state.date.display}`,
      `· 累计经历事件：${state.pastEvents.join(" / ")}`,
      `· flags：${state.flags.join(" / ") || "无"}`,
      `· 关系：${Object.values(state.relations).map((r) => `${r.name}(${r.note ?? "—"})`).join("，")}`,
    ].join("\n"),
  };

  const messages: ChatMessage[] = [intro, stateBlock, ...history];
  return runLLMText({ messages, sampling: { temperature: 0.85, max_tokens: 2000 } });
}

export function endingLabel(t: EndingType): string {
  return {
    graduation: "毕业终章",
    disappearance_stay: "消失分支永居",
    closed_space_loss: "闭锁空间牺牲",
    recovered: "被回收",
    world_reset: "世界重置遗忘",
    sos_dissolved: "SOS 团解散",
  }[t];
}
