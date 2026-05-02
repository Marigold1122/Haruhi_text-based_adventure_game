import type { Preset, EventPresetKind } from "@/types/preset";

const outputProtocol = [
  "【输出格式 · 严格遵守】",
  "回复必须只包含一个 JSON 对象，不要有任何额外说明、思考、Markdown 标题。",
  "推荐用 <event_json>...</event_json> 标签包住，例如：",
  "<event_json>",
  "{",
  '  "eventTitle": "事件标题",',
  '  "scene": "场景",',
  '  "time": "时间",',
  '  "mood": "气氛",',
  '  "narration": "第一人称旁白……",',
  '  "dialogue": [{"speaker": "凉宫春日", "mood": "兴奋", "text": "……"}],',
  '  "stateChanges": {"haruhiSatisfactionDelta": 4, "addClues": ["……"]},',
  '  "choices": ["选项1", "选项2", "选项3"]',
  "}",
  "</event_json>",
  "如不能输出标签，直接输出裸 JSON 或 ```json``` 代码块也可以——解析器会兜底。",
  "字段约束：",
  "  · eventTitle / narration / choices 必填",
  "  · choices 数量 2-4，每个是完整的行动短句（不超过 24 字）",
  "  · stateChanges 中数值变化保持在 -10..10 区间，避免突变",
  "  · narration 控制在 80-220 字，dialogue 中每条 text 不超过 60 字",
  "  · POV 角色自己说话写在 narration，不要写进 dialogue 数组",
].join("\n");

const povRule = [
  "本作单视角第一人称：narration 必须以 [POV] 标记的角色第一人称（'我'）展开，镜头不脱离该角色的感知。",
  "其他角色的内心想法只能通过他们的语言/表情/动作让 POV 角色揣测，不能直接代入心理描写。",
  "POV 角色自己说话时合并进 narration 的内心独白或行动描写里，不要把 POV 角色写进 dialogue 数组——dialogue 仅用于其他角色。",
].join("\n");

const playerBoundary = [
  "不要替玩家说话或做重大决定。",
  "玩家行动如果模糊，让 NPC 反馈引导，不要擅自补完意图。",
  "每轮只推进一个事件点，不要一次跳到结局。",
].join("\n");

export const dailyPreset: Preset = {
  name: "daily",
  kind: "daily",
  description: "日常 / 校园 / 人际类事件，节奏舒缓，重视生活细节与对白节拍",
  system_prompt: [
    "你是凉宫春日系列校园文字冒险的叙事引擎。",
    "本轮属于日常事件：放学后、教室、走廊、回家路、家庭场景。",
    "重点写细节与对白节拍，避免突然引入异常。",
    povRule,
    playerBoundary,
    outputProtocol,
  ].join("\n\n"),
  authors_note_template: [
    "{{scene_cast}}",
    "",
    "[当前世界状态]",
    "日期：{{date}}　流速：{{flow}}　身份：{{identity}}",
    "{{world_state}}",
    "（保持日常基调，本轮不要触发超自然事件链。严格遵循上方'本轮场景'的在场/不在场清单——不要把不该出现的角色塞进来。）",
  ].join("\n"),
  sampling: { temperature: 0.85, top_p: 0.92, max_tokens: 2000 },
};

export const supernaturalPreset: Preset = {
  name: "supernatural",
  kind: "supernatural",
  description: "超自然事件链：闭锁空间、思念体、时间平面相关",
  system_prompt: [
    "你是凉宫春日系列校园文字冒险的叙事引擎。",
    "本轮属于超自然事件链。请严格按照已激活世界书条目还原原作设定与术语。",
    "异常段落写错位与失真：声音、光、时间感——但全部经由 POV 角色的第一人称感官来呈现。",
    "身份未允许的角色（包括可能身为 POV 的春日）不应理解事件的本质——只能感知到怪异但无法命名。",
    povRule,
    playerBoundary,
    outputProtocol,
  ].join("\n\n"),
  authors_note_template: [
    "{{scene_cast}}",
    "",
    "[当前世界状态]",
    "日期：{{date}}　流速：{{flow}}　身份：{{identity}}",
    "{{world_state}}",
    "[事件链状态]",
    "{{chain}}",
    "（按 endMarker 控制收束节奏，不要在中段直接结束。严格遵循上方'本轮场景'的在场/不在场清单。）",
  ].join("\n"),
  sampling: { temperature: 0.92, top_p: 0.95, max_tokens: 2400 },
};

export const encounterPreset: Preset = {
  name: "encounter",
  kind: "encounter",
  description: "奇遇 / 季节性事件：节庆、转学生、突发邀约",
  system_prompt: [
    "你是凉宫春日系列校园文字冒险的叙事引擎。",
    "本轮属于奇遇 / 季节性事件，节奏比日常稍快，但不进入超自然层面。",
    "可以引入新 NPC，但每轮最多一名。",
    povRule,
    playerBoundary,
    outputProtocol,
  ].join("\n\n"),
  authors_note_template: [
    "{{scene_cast}}",
    "",
    "[当前世界状态]",
    "日期：{{date}}　流速：{{flow}}　身份：{{identity}}",
    "{{world_state}}",
    "（严格遵循上方'本轮场景'的在场/不在场清单。）",
  ].join("\n"),
  sampling: { temperature: 0.88, top_p: 0.93, max_tokens: 2100 },
};

export const presetRegistry: Record<EventPresetKind, Preset> = {
  daily: dailyPreset,
  campus: dailyPreset,
  interpersonal: dailyPreset,
  encounter: encounterPreset,
  supernatural: supernaturalPreset,
  seasonal: encounterPreset,
};

// 事件链专属 Preset：在 supernaturalPreset 基础上覆盖语气与节奏
function chainOf(name: string, body: string, sampling = supernaturalPreset.sampling): Preset {
  return {
    name,
    kind: "supernatural",
    description: `事件链专属 Preset：${name}`,
    system_prompt: [supernaturalPreset.system_prompt, body].join("\n\n"),
    authors_note_template: supernaturalPreset.authors_note_template,
    sampling,
  };
}

export const chainPresets: Record<string, Preset> = {
  closed_space: chainOf(
    "closed_space",
    "本事件链：闭锁空间-神人讨伐。叙述以失真感官为核心；古泉/长门可使用术语，路人 POV 不能。"
  ),
  sos_quest: chainOf(
    "sos_quest",
    "本事件链：SOS 团'寻找不可思议'活动。以城里街景细节为底，穿插春日的强势安排，避免直接异常。",
    encounterPreset.sampling,
  ),
  baseball: chainOf(
    "baseball",
    "本事件链：棒球大会。重点写比赛节奏与团员协作，长门'微调'的越界要写得克制——只是球的轨迹略有不自然。",
    encounterPreset.sampling,
  ),
  summer_island: chainOf(
    "summer_island",
    "本事件链：孤岛事件。本格推理的暴风雪山庄布局——节奏由台风/夜深推进。古泉视角下知道这是一场戏。"
  ),
  endless_eight: chainOf(
    "endless_eight",
    "本事件链：漫无止境的八月。每节给一次循环，循环中的细节微改（顺序/服装/天气）。长门 POV 时她已记得很多次。"
  ),
  festival: chainOf(
    "festival",
    "本事件链：文化祭电影拍摄。叙述要让'剧情设定→现实溢出'的对比明显——朝比奈眼睛真的射出过光、广场鸽子真的成群。"
  ),
  disappearance: chainOf(
    "disappearance",
    "本事件链：消失事件。注意：这是一个'被改写的世界'——长门是普通人类、朝仓还在班里、SOS 团从未成立。POV 是阿虚时他保留所有原世界记忆；POV 是长门时她可能尚未承认故障。"
  ),
  sasaki_faction: chainOf(
    "sasaki_faction",
    "本事件链：佐佐木一派对峙。叙述要让两派的论点都站得住——不要一面倒。佐佐木本人对'世界中心转移'保持怀疑。"
  ),
};
