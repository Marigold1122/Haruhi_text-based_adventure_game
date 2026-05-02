// 随机模式：玩家以原创角色游玩。
// 两段式生成：
//   ① generateMinimalCard：≤10s。description 是 stub XML（只 6 个 section），其他字段也写极简。让玩家立刻进游戏。
//   ② expandCardDescription：~15s 在后台跑。把 description 升级成完整 14-section XML。在玩家阅读首批剧情时悄悄完成。

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

// ============================================================
// 阶段 ① 最小卡 — description 是 stub XML，目标 ≤10s
// ============================================================

const STUB_DESCRIPTION_TEMPLATE = `<角色档案>
  <姓名>{中文名}（{罗马音}）</姓名>
  <称号>{1-2 个标签}</称号>
  <角色概述>{1 句话：性格底色 + 当前处境}</角色概述>
  <个性>
    <MBTI>{MBTI 类型 + 一句中文标签}</MBTI>
    <性格标签>{4-6 个关键词，顿号分隔}</性格标签>
  </个性>
  <身体特征>
    <头发>{颜色 / 长度 / 发型；禁用：栗短发+黄丝带（春日）/ 淡紫短发+眼镜（长门）/ 栗长发（朝比奈）/ 深蓝长发（朝仓）}</头发>
    <其他>{1 个标志物}</其他>
  </身体特征>
  <服装><典型穿着>{北口高校校服 + 1 件随身配饰}</典型穿着></服装>
  <附加信息>{完整档案稍后补充}</附加信息>
</角色档案>`;

const MINIMAL_SCHEMA_HINT = `请以严格的 JSON 输出，结构为 SillyTavern Character Card V2，但**所有字段都要短**（这是为了让玩家立刻进游戏）：

{
  "spec": "chara_card_v2",
  "spec_version": "2.0",
  "data": {
    "name": "...",
    "description": "<角色档案>...stub XML（按下方模板）...</角色档案>",
    "personality": "{2 短行}",
    "scenario": "{2-3 短行：北口高校 X 班 + 入学日 + 与 SOS 团关系}",
    "first_mes": "{1 段第一人称开场，30-60 字}",
    "mes_example": "{<START> 起头，1 段对话示例}",
    "system_prompt": "[POV] {角色名}\\n严格单视角第一人称。",
    "post_history_instructions": "回复必须以 <event_json> 块结尾。",
    "alternate_greetings": [],
    "tags": ["凉宫春日同人", "原创角色", "MBTI 生成"],
    "creator": "haruhi-text-adventure",
    "character_version": "0.1.0",
    "extensions": {
      "default_identity": "passerby|fringe|core|anomaly|observer",
      "archetype": "..."
    }
  }
}

【description 字段 stub 模板】
${STUB_DESCRIPTION_TEMPLATE}

【输出要求】
  · 整张卡控制在 600 中文字以内（含标签）
  · description 严格按上方 stub 模板填，6 个 section 一个不能少
  · {花括号} 必须替换成具体内容；不能留下花括号原样输出
  · 不要 Markdown 代码块`;

export async function generateMinimalCard(seed: RandomCharacterSeed): Promise<CharacterCardV2> {
  const arch = archetypeInfo[seed.match.archetype];
  const identity = seed.identity ?? arch.defaultIdentity;
  const guide = identityGuides[identity];

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "你是凉宫春日系列同人世界的角色设计师。",
        "玩家做完 MBTI 测试匹配到一个原型——请快速生成一份**最小卡**。",
        "description 字段是简化版 XML 占位（完整 14-section 版本会在玩家进游戏后由另一次调用单独扩展，你不用管那部分）。",
        "",
        "约束：",
        "1) 全新原创角色（不是阿虚 / 凉宫 / 长门 / 朝比奈 / 古泉 / 朝仓 / 鹤屋 / 佐佐木 等原作 NPC）。",
        "2) 起点：北口高校入学日 2002-04-08。",
        "3) 内核忠实匹配的原型；玩家补充信息纳入设计（外观、姓名、家庭背景优先采纳玩家说的）。",
        "4) **所有字段都要短**——目标是这次调用 ≤10s 完成。",
        "5) system_prompt 以 [POV] {角色名} 开头并写明第一人称约束。",
        "6) extensions.archetype 填本次匹配的 id。",
        "7) scenario 必须含：北口高校 × 班级、入学日、与 SOS 团的关系。anomaly/observer 还要写真实身份 + 所属组织。",
        "",
        "【匹配的人格原型】",
        `${arch.name}（${arch.mbti}）：${arch.shortDesc}`,
        `内核：${arch.coreTraits}`,
        "",
        "【该身份的剧情边界】",
        `${guide.label}：${guide.shortDesc}`,
        "",
        MINIMAL_SCHEMA_HINT,
        "",
        "只输出 JSON。",
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

  // 最小卡输出量约 500-800 token，flash 模型 5-10s 完成
  const raw = await runLLMText({ messages, sampling: { temperature: 0.85, max_tokens: 1500 } });
  const parsed = parseCardJson(raw);
  if (!parsed) throw new Error("LLM 返回的角色卡 JSON 无法解析。原始输出：\n" + raw.slice(0, 600));

  parsed.data.extensions = {
    ...parsed.data.extensions,
    default_identity: identity,
    archetype: seed.match.archetype,
    player_stats: seed.match.normalizedStats,
    /** stub 标记：StoryView 看到这个 flag 会触发后台 expand */
    description_pending_expand: true,
  };
  return parsed;
}

// ============================================================
// 阶段 ② 后台扩展 description — 完整 14-section XML
// ============================================================

const FULL_DESCRIPTION_TEMPLATE = `<角色档案>
  <姓名>{中文名}（{罗马音} / {Romaji}）</姓名>
  <称号>{2-3 个标签，顿号分隔}</称号>
  <角色概述>{80-150 字。一段话：这个角色是谁、性格底色、当前处境、最重要的内核}</角色概述>

  <基本信息>
    <性别>{男 / 女}</性别>
    <年龄>
      <真实年龄>{15 岁；anomaly 类可能更大需注明}</真实年龄>
      <外表年龄>{看起来多大}</外表年龄>
    </年龄>
    <身份>{北口高校一年 X 班学生；anomaly/observer 还要写真实身份 + 所属组织}</身份>
    <其他>{生日 / 血型 / 身高}</其他>
  </基本信息>

  <个性>
    <MBTI>{MBTI 类型 + 一句中文标签}</MBTI>
    <性格标签>{6-8 个关键词，顿号分隔}</性格标签>
    <补充说明>{60-100 字。结合主匹配 + 次匹配两个原型的特质}</补充说明>
  </个性>

  <目标与动机>
    <短期目标>
      <目标 id="1"><内容>{一句话目标}</内容><动机>{为什么——与人格内核呼应}</动机></目标>
    </短期目标>
    <长期目标>
      <目标 id="1"><内容>{一句话目标}</内容><动机>{为什么}</动机></目标>
    </长期目标>
  </目标与动机>

  <日常活动>
    <活动><地点>{教室 / 文艺部 / 家 / 通学路 任选}</地点><内容>{在这里做什么，一两句}</内容></活动>
    {共 2 条}
  </日常活动>

  <说话方式>
    <总体风格>{一句话总结}</总体风格>
    <语言特征>{口头禅 / 称呼习惯}</语言特征>
    <对话示例>
      <示例>
        <对象>{凉宫 / 阿虚 / 长门 / 朝比奈 / 古泉 / 自己 任选}</对象>
        <场景>{触发场景，简短}</场景>
        <内容>{具体台词一段}</内容>
      </示例>
      {共 1 条}
    </对话示例>
  </说话方式>

  <关系网>
    <关系><对象>{NPC 名字}</对象><描述>{入学第一天的关系起点：传闻 / 一面之缘 / 间接认识}</描述></关系>
    {共 3 条，至少含凉宫春日}
  </关系网>

  <偏好>
    <喜欢><项>...</项>{共 3 项}</喜欢>
    <讨厌><项>...</项>{共 3 项}</讨厌>
  </偏好>

  <身体特征>
    <总体>{身高 / 体型 / 气质}</总体>
    <五官>{眼睛 / 默认表情}</五官>
    <头发>{颜色 / 长度 / 发型——必须与最小卡一致}</头发>
    <身材>{体型}</身材>
    <其他>{体质 / 标志物}</其他>
  </身体特征>

  <服装>
    <典型穿着>{与最小卡一致的校服 + 配饰描述}</典型穿着>
  </服装>

  <背景>
    <背景故事>{80-150 字。家庭、出身、关键过去}</背景故事>
    <成长经历>{50-90 字。小学—初中—高中入学的轨迹}</成长经历>
    <重大事件>1. ...; 2. ...; 3. ...; {共 3 条}</重大事件>
  </背景>

  <时间线>
    <阶段 id="1"><时间>{年龄段}</时间><事件>{发生了什么}</事件><状态>{心理/物理状态}</状态></阶段>
    {共 3 阶段；最后一个 id 必须是"北口高校入学典礼当天 · 现在"}
  </时间线>

  <角色概念>
    <概念><名称>{抽象概念名}</名称><说明>{如何体现}</说明></概念>
    {共 2 条}
  </角色概念>

  <附加信息>{1-2 句。随身物品 / 口头习惯 / 特殊体质}</附加信息>
</角色档案>`;

export async function expandCardDescription(
  card: CharacterCardV2,
  seed: RandomCharacterSeed,
): Promise<CharacterCardV2> {
  const arch = archetypeInfo[seed.match.archetype];
  const identity = seed.identity ?? arch.defaultIdentity;
  const guide = identityGuides[identity];

  const statLines = statKeys.map((k) => {
    const v = seed.match.normalizedStats[k];
    return `  · ${statLabels[k]}：${v.toFixed(1)} / 10`;
  });
  const rankLines = seed.match.ranking
    .slice(0, 5)
    .map((r) => `  · ${archetypeInfo[r.archetype].name}：相似度 ${r.similarity}%`);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "你是凉宫春日系列同人角色设计师。",
        "玩家已经在用一份最小卡进入游戏。**现在只需要把 description 字段升级为完整的 14-section XML**——",
        "其他字段（name / personality / scenario / first_mes 等）都不用动，也不要重新生成 V2 JSON。",
        "",
        "**只输出完整的 <角色档案>...</角色档案> XML 块本身**——不要 JSON 包装、不要 Markdown 代码块、不要任何解释文字。",
        "",
        "约束：",
        "1) 14 个一级 section 一个不能少：姓名 / 称号 / 角色概述 / 基本信息 / 个性 / 目标与动机 / 日常活动 / 说话方式 / 关系网 / 偏好 / 身体特征 / 服装 / 背景 / 时间线 / 角色概念 / 附加信息",
        "2) **与最小卡保持一致**：name / 头发颜色 / 服装风格 / 标志物 必须与已有 stub 一致；其余可独立扩展。",
        "3) 内核忠实匹配的原型；次匹配原型可作为人格阴影体现在次要特质上。",
        "4) 模板里 {花括号} 必须替换成具体内容；不能留下花括号。",
        "5) 模板里「{共 N 条}」这类计数说明要兑现。",
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
        "【该身份的剧情边界】",
        `身份：${guide.label}（${guide.shortDesc}）`,
        guide.guidance,
        "",
        "【完整 XML 模板】",
        FULL_DESCRIPTION_TEMPLATE,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "[已有最小卡 · 关键字段]",
        `name: ${card.data.name}`,
        `personality: ${card.data.personality}`,
        `scenario: ${card.data.scenario}`,
        `description (stub): ${card.data.description}`,
        "",
        seed.supplement?.trim() ? `[玩家补充信息] ${seed.supplement.trim()}` : "",
        "",
        "请直接输出完整 <角色档案> XML：",
      ].filter(Boolean).join("\n"),
    },
  ];

  // 完整 XML 约 1500-2000 token；flash 上 ~15s
  const raw = await runLLMText({ messages, sampling: { temperature: 0.85, max_tokens: 3500 } });
  const xml = extractXmlBlock(raw);
  if (!xml) {
    console.warn(
      "[expandCardDescription] 未提取到 <角色档案> XML，保留最小卡。原始输出预览：",
      raw.slice(0, 200),
    );
    return card;
  }

  return {
    ...card,
    data: {
      ...card.data,
      description: xml,
      extensions: {
        ...card.data.extensions,
        description_pending_expand: false,
      },
    },
  };
}

function extractXmlBlock(text: string): string | null {
  const m = text.match(/<角色档案>[\s\S]*?<\/角色档案>/);
  return m ? m[0] : null;
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
