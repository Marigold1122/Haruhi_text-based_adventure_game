// 随机模式：玩家以原创角色游玩。
// 玩家填背景、性格、身份（5 选 1） → LLM 生成符合 V2 spec 的角色卡 → 自动进入故事。

import type { CharacterCardV2 } from "@/types/character";
import type { ChatMessage } from "@/types/turn";
import type { IdentityLevel } from "@/types/lorebook";
import { runLLMText } from "./llm";
import { identityGuides } from "@/data/identityGuide";

export type RandomCharacterSeed = {
  /** 玩家填的姓名（可留空让 LLM 命名） */
  name?: string;
  background: string;     // 出身 / 背景
  personality: string;    // 性格
  identity: IdentityLevel;
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
    "tags": ["凉宫春日同人", "原创角色", "随机生成"],
    "creator": "haruhi-text-adventure",
    "character_version": "0.1.0",
    "extensions": {
      "default_identity": "passerby|fringe|core|anomaly|observer"
    }
  }
}`;

export async function generateRandomCharacter(seed: RandomCharacterSeed): Promise<CharacterCardV2> {
  const guide = identityGuides[seed.identity];

  // 给 LLM 列出身份特征要求
  const identityHint = `身份：${guide.label}（${guide.shortDesc}）\n` + guide.guidance;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "你是凉宫春日系列同人世界的角色设计师。",
        "玩家在游戏开始时填写自己的出身、性格、身份；你需要据此生成一张完全原创的角色卡（V2 spec），让玩家以此卡为 POV 游玩。",
        "**这个角色不是原作中已有的角色**（不是阿虚 / 凉宫 / 长门 / 朝比奈 / 古泉 / 朝仓 / 鹤屋 / 佐佐木等）——必须是全新的人。",
        "",
        "约束：",
        "1) 角色必须可信地嵌入凉宫春日系列的世界观（北口高校 / SOS 团 / 三大组织 等）。",
        "2) 起点固定为'北高入学日 2002-04-08'——角色刚成为北高一年级新生（或刚以新生伪装潜入）。",
        "3) **身份层级决定基本框架**——按用户给的身份生成对应的真实背景：",
        "   - passerby（路人学生）：完全的普通新生，没有任何超自然背景。",
        "   - fringe（SOS 团边缘）：普通学生 + 一个让其与某 SOS 成员有早期接触的小钩子（例如同初中、隔壁班、某共同朋友）。",
        "   - core（SOS 团核心）：罕见——通常需要一个特殊理由让春日在第一天就把这人盯上。",
        "   - anomaly（异常存在）：必须有具体的真实身份，从以下选一种或自创类似：",
        "     · 未来人组织（受限制级或上级派；与朝比奈同方但不同派别）",
        "     · 超能力者协会（'机关'温和派或激进派；与古泉同方）",
        "     · 信息统合思念体（与长门、朝仓同方但派别不同）",
        "     · 其他派系的人（极少见但允许）",
        "   - observer（观察者）：更高维度——天盖领域代理 / 思念体内的一个独立派系 / 未明的第四方。",
        "4) system_prompt 字段必须以 [POV] {角色名} 开头，并明确单视角第一人称叙事约束。",
        "5) post_history_instructions 必须包含'回复必须以 <event_json> 块结尾'。",
        "6) mes_example 给 4-6 段；description / personality / scenario 各不少于 4 行。",
        "7) scenario 必须明确写出：①北口高校 × 班级；②刚入学第一天；③与 SOS 团的关系（按身份决定亲密度）；④如是 anomaly/observer，必须明确真实身份与所属组织 + 当前任务。",
        "",
        "【该身份的剧情边界（生成时请参考）】",
        identityHint,
        "",
        SCHEMA_HINT,
        "",
        "只输出 JSON，不要前置寒暄，不要 Markdown 代码块。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        seed.name ? `[姓名] ${seed.name}` : "[姓名] 由你设定",
        `[出身 / 背景] ${seed.background}`,
        `[性格] ${seed.personality}`,
        `[身份] ${seed.identity}（${identityGuides[seed.identity].label}）`,
      ].join("\n"),
    },
  ];

  const raw = await runLLMText({ messages, sampling: { temperature: 0.95, max_tokens: 4500 } });
  const parsed = parseCardJson(raw);
  if (!parsed) throw new Error("LLM 返回的角色卡 JSON 无法解析。原始输出：\n" + raw.slice(0, 600));
  // 强制把 default_identity 字段对齐到玩家选的身份
  parsed.data.extensions = { ...parsed.data.extensions, default_identity: seed.identity };
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
