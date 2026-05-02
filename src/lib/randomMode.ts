// 随机模式：玩家以原创角色游玩。
// 流程：玩家做完 10 道凉宫风味 MBTI 测试 → 匹配人格原型 → 补充输入 → LLM 生成 V2 角色卡 → 进入故事

import type { CharacterCardV2 } from "@/types/character";
import type { ChatMessage } from "@/types/turn";
import type { IdentityLevel } from "@/types/lorebook";
import { runLLMText } from "./llm";
import { identityGuides } from "@/data/identityGuide";
import {
  archetypeInfo,
  statLabels,
  statKeys,
} from "@/data/characterArchetypes";
import type { MatchResult } from "./personalityMatcher";

export type RandomCharacterSeed = {
  /** 玩家可选的姓名（可留空让 LLM 命名） */
  name?: string;
  /** MBTI 匹配结果（含 archetype, rawStats, normalizedStats, ranking） */
  match: MatchResult;
  /** 玩家在测试结束后的补充输入（可空） */
  supplement?: string;
  /** 默认身份——通常由 archetype 决定，但可被覆盖 */
  identity?: IdentityLevel;
};

const SCHEMA_HINT = `请以严格的 JSON 输出，结构与 SillyTavern Character Card V2 spec 完全一致：
{
  "spec": "chara_card_v2",
  "spec_version": "2.0",
  "data": {
    "name": "...",
    "description": "...",
    "personality": "...",
    "scenario": "...",
    "first_mes": "...",
    "mes_example": "...",
    "creator_notes": "...",
    "system_prompt": "...",
    "post_history_instructions": "...",
    "alternate_greetings": [],
    "tags": ["凉宫春日同人", "原创角色", "MBTI 生成"],
    "creator": "haruhi-text-adventure",
    "character_version": "0.1.0",
    "extensions": {
      "default_identity": "passerby|fringe|core|anomaly|observer",
      "archetype": "..."
    }
  }
}`;

export async function generateRandomCharacter(seed: RandomCharacterSeed): Promise<CharacterCardV2> {
  const arch = archetypeInfo[seed.match.archetype];
  const identity = seed.identity ?? arch.defaultIdentity;
  const guide = identityGuides[identity];

  // 玩家归一化后的 8 维参数（0-10）
  const statLines = statKeys.map((k) => {
    const v = seed.match.normalizedStats[k];
    return `  · ${statLabels[k]}：${v.toFixed(1)} / 10`;
  });

  // 与各原型相似度排名（让 LLM 看到次优倾向）
  const rankLines = seed.match.ranking
    .slice(0, 5)
    .map((r) => `  · ${archetypeInfo[r.archetype].name}：相似度 ${r.similarity}%`);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "你是凉宫春日系列同人世界的角色设计师。",
        "玩家刚刚做完 10 道凉宫风味 MBTI 测试——根据测试结果，他们匹配到了某个人格原型；同时玩家可能补充了自己的角色信息。",
        "请据此生成一张完全原创的角色卡（V2 spec），让玩家以此卡为 POV 游玩。",
        "",
        "**这个角色不是原作中已有的角色**（不是阿虚 / 凉宫 / 长门 / 朝比奈 / 古泉 / 朝仓 / 鹤屋 / 佐佐木等）——必须是全新的人，但内核与匹配的原型相似。",
        "",
        "约束：",
        "1) 角色必须可信地嵌入凉宫春日系列的世界观（北口高校 / SOS 团 / 三大组织 等）。",
        "2) 起点固定为'北高入学日 2002-04-08'——角色刚成为北高一年级新生（或刚以新生伪装潜入）。",
        "3) **核心人格内核必须忠实于匹配的原型**——参考下方'人格原型'部分给出的关键特质，但要在外观、姓名、家庭背景上做出独立设计，让这个角色独立于原作角色。",
        "4) **如果玩家给了补充信息，必须把它纳入设计**——补充信息会优先决定外观、姓名、家庭背景等具体细节，但不要破坏人格内核。",
        "5) **次优倾向不要无视**——MBTI 测试得分给了一个排名，第二高的原型也可以作为'人格阴影'体现在角色的某些次要特质中（例如：主匹配是阿虚但次匹配是佐佐木，可让角色在吐槽之外偶尔流露辩证思考）。",
        "6) system_prompt 字段必须以 [POV] {角色名} 开头，并明确单视角第一人称叙事约束。",
        "7) post_history_instructions 必须包含'回复必须以 <event_json> 块结尾'。",
        "8) mes_example 给 4-6 段；description / personality / scenario 各不少于 4 行。",
        "9) scenario 必须明确写出：①北口高校 × 班级；②刚入学第一天；③与 SOS 团的关系（按身份决定亲密度）；④如是 anomaly/observer，必须明确真实身份与所属组织 + 当前任务。",
        "10) extensions.archetype 字段填本次匹配的原型 id。",
        "",
        "【匹配的人格原型】",
        `主匹配：${arch.name}（${arch.mbti}）`,
        `一句话：${arch.shortDesc}`,
        `内核详细：${arch.coreTraits}`,
        "原型解说：",
        arch.longDesc,
        "",
        "[玩家在 8 维参数上的画像（0-10）]",
        ...statLines,
        "",
        "[与各原型的相似度排名]",
        ...rankLines,
        "",
        "【该身份的剧情边界（生成时请参考）】",
        `身份：${guide.label}（${guide.shortDesc}）`,
        guide.guidance,
        "",
        SCHEMA_HINT,
        "",
        "只输出 JSON，不要前置寒暄，不要 Markdown 代码块。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        seed.name ? `[玩家提供的姓名] ${seed.name}` : "[姓名] 由你设定",
        `[匹配人格原型] ${arch.name}`,
        `[默认身份] ${identity}（${identityGuides[identity].label}）`,
        seed.supplement?.trim()
          ? `[玩家补充信息] ${seed.supplement.trim()}`
          : "[玩家补充信息] （未填写——请基于人格原型自由设计）",
      ].join("\n"),
    },
  ];

  const raw = await runLLMText({ messages, sampling: { temperature: 0.95, max_tokens: 4500 } });
  const parsed = parseCardJson(raw);
  if (!parsed) throw new Error("LLM 返回的角色卡 JSON 无法解析。原始输出：\n" + raw.slice(0, 600));
  parsed.data.extensions = {
    ...parsed.data.extensions,
    default_identity: identity,
    archetype: seed.match.archetype,
    player_stats: seed.match.normalizedStats,
  };
  return parsed;
}

function parseCardJson(text: string): CharacterCardV2 | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fence ? fence[1] : text;
  const m = candidate.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    if (obj?.spec !== "chara_card_v2") return null;
    if (!obj?.data?.name) return null;
    return obj as CharacterCardV2;
  } catch {
    return null;
  }
}
