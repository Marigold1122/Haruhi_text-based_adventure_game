// 随机模式：让 LLM 根据出身/性格/起点生成一张全新的 V2 角色卡
// 同样符合 chara_card_v2 spec，可被本游戏直接使用，也可导出供二次使用。

import type { CharacterCardV2 } from "@/types/character";
import type { ChatMessage } from "@/types/turn";
import { runLLMText } from "./llm";

export type RandomCharacterSeed = {
  background: string;     // 例如 "北高一年级，转学生，戴眼镜的女生"
  personality: string;    // 例如 "怕生但好奇，喜欢观察"
  startingPoint: string;  // 例如 "北高入学日"
  identityHint?: string;  // 可选：路人 / 边缘 / 核心 / 异常 / 观察者
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
    "tags": ["凉宫春日", "随机生成"],
    "creator": "haruhi-text-adventure",
    "character_version": "0.1.0",
    "extensions": {
      "earliest_starting_point": "...",
      "default_identity": "passerby|fringe|core|anomaly|observer"
    }
  }
}`;

export async function generateRandomCharacter(seed: RandomCharacterSeed): Promise<CharacterCardV2> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "你是凉宫春日系列同人世界的角色设计师。",
        "请根据用户给出的种子信息，输出一张原创角色卡——可以是路人/边缘/核心/异常/观察者中的任一类型。",
        "约束：",
        "1) 角色必须可信地嵌入凉宫春日系列的世界观（北口高校 / SOS 团 / 三大组织 等）。",
        "2) system_prompt 字段必须以 [POV] {角色名} 开头，并明确单视角第一人称叙事约束。",
        "3) post_history_instructions 必须包含'回复必须以 <event_json> 块结尾'。",
        "4) mes_example 给 4-6 段；description / personality / scenario 各不少于 3 行。",
        "5) extensions.earliest_starting_point 必须从以下选一：before_north_high, north_high_entrance, sos_founded, after_members_joined, summer_island, endless_eight, festival, disappearance, sasaki_faction。",
        "",
        SCHEMA_HINT,
        "",
        "只输出 JSON，不要前置寒暄，不要 Markdown 代码块。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `[出身] ${seed.background}`,
        `[性格] ${seed.personality}`,
        `[起点] ${seed.startingPoint}`,
        seed.identityHint ? `[身份提示] ${seed.identityHint}` : "",
      ].filter(Boolean).join("\n"),
    },
  ];

  const raw = await runLLMText({ messages, sampling: { temperature: 0.95, max_tokens: 3500 } });
  const parsed = parseCardJson(raw);
  if (!parsed) throw new Error("LLM 返回的角色卡 JSON 无法解析。");
  return parsed;
}

function parseCardJson(text: string): CharacterCardV2 | null {
  // 兼容三种返回：纯 JSON / ```json...``` / 头尾带文字
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
