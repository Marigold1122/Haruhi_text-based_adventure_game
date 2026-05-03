// 7 个角色原型——MBTI 测试结果映射目标
//
// 每个原型有一个 8 维参数画像（profile），玩家做完测试后会得到自己的 8 维参数，
// 与每个原型画像求余弦相似度，相似度最高的即匹配。

import type { CharacterCardV2 } from "@/types/character";
import type { IdentityLevel } from "@/types/lorebook";
import { npcReferenceCards } from "@/data/characters";

export type CharacterArchetype =
  | "haruhi"
  | "kyon"
  | "nagato"
  | "asahina"
  | "koizumi"
  | "tsuruya"
  | "asakura";

/**
 * 8 维参数（每项 0-10）。用于刻画一个人的"性格画像"。
 *
 * - energy        活力：行动力、对外能量
 * - composure     沉稳：临危不乱、不轻易慌张
 * - empathy       共情：能体会他人感受、为别人着想
 * - curiosity     好奇：探索新事物、追究未知
 * - rationality   理性：逻辑分析、冷静推演
 * - assertiveness 主导：主导话题、推动局面
 * - efficiency    效率：追求最优解、执行力强
 * - introspection 自省：自我审视、内心戏丰富
 */
export type Stats = {
  energy: number;
  composure: number;
  empathy: number;
  curiosity: number;
  rationality: number;
  assertiveness: number;
  efficiency: number;
  introspection: number;
};

export const statKeys: (keyof Stats)[] = [
  "energy",
  "composure",
  "empathy",
  "curiosity",
  "rationality",
  "assertiveness",
  "efficiency",
  "introspection",
];

export const statLabels: Record<keyof Stats, string> = {
  energy: "活力",
  composure: "沉稳",
  empathy: "共情",
  curiosity: "好奇",
  rationality: "理性",
  assertiveness: "主导",
  efficiency: "效率",
  introspection: "自省",
};

export type ArchetypeInfo = {
  id: CharacterArchetype;
  name: string;
  mbti: string;
  shortDesc: string;
  longDesc: string;
  defaultIdentity: IdentityLevel;
  /** 给 LLM 看的"人格内核"——生成原创角色卡时作为锚点 */
  coreTraits: string;
  /** 8 维参数画像（0-10） */
  profile: Stats;
  /** 引用的原作 NPC 卡，让 LLM 能读到完整设定作为风味基底 */
  referenceCard: CharacterCardV2;
  /** 立绘 URL（相对于 public/ 的路径）；图片不存在时 UI 会显示占位 */
  portraitUrl: string;
  /** 立绘占位用的主色（图片未生成时的兜底背景） */
  portraitColor: string;
};

export const archetypeInfo: Record<CharacterArchetype, ArchetypeInfo> = {
  haruhi: {
    id: "haruhi",
    name: "凉宫春日型",
    mbti: "ENTP-A",
    shortDesc: "活力过载、我行我素、对'平凡'毫无耐心的世界搅动者",
    longDesc: [
      "你属于'活力过载、我行我素'的人格——决定的事不允许任何人讨价还价，对一切'普通'毫无耐心。",
      "你不会假装情绪，开心和不开心都直接写在脸上。",
      "你身边的人不知不觉间会被你拽进各种奇思妙想——这是你最迷人也最折磨人的特质。",
    ].join("\n"),
    defaultIdentity: "core",
    coreTraits: "活力过载、命令式、孩子气直率、对'普通'毫无耐心、判断力跳跃、对'有趣'的事毫无抵抗力",
    profile: {
      energy: 10, composure: 3, empathy: 3, curiosity: 9,
      rationality: 5, assertiveness: 10, efficiency: 6, introspection: 2,
    },
    referenceCard: npcReferenceCards.haruhi,
    portraitUrl: "/portraits/haruhi.png",
    portraitColor: "#d33b32",
  },
  kyon: {
    id: "kyon",
    name: "阿虚型",
    mbti: "INTP-T",
    shortDesc: "嘴硬心软的吐槽体质现实主义者",
    longDesc: [
      "你属于'嘴硬心软的吐槽体质'人格——内心独白几乎从不停止，对一切夸张事物先翻白眼，再被动卷入。",
      "你嘴上嫌麻烦，行动上替身边人收拾——这是你不会承认但所有人都知道的事。",
      "你自我标榜'最普通的人'，但每次重大节点都做出超出'普通'的果断选择。",
    ].join("\n"),
    defaultIdentity: "fringe",
    coreTraits: "吐槽体质、嘴硬心软、内心戏丰富、现实主义、关键时刻会动手、对夸张事物先翻白眼再被动卷入",
    profile: {
      energy: 4, composure: 6, empathy: 7, curiosity: 5,
      rationality: 7, assertiveness: 3, efficiency: 5, introspection: 9,
    },
    referenceCard: npcReferenceCards.kyon,
    portraitUrl: "/portraits/kyon.png",
    portraitColor: "#7c5e3c",
  },
  nagato: {
    id: "nagato",
    name: "长门有希型",
    mbti: "INTJ-T（极简版）",
    shortDesc: "极简、无机、内核被压在层层信息处理之下的执行者",
    longDesc: [
      "你属于'极简到极致'的人格——所有话语压缩到最少音节，情绪反应近乎为零。",
      "你的'冷淡'不是冷漠，只是不显示——内核温柔被压在层层信息处理之下。",
      "你的学习速度极快，对身边的事有近乎程序化的精确观察。",
    ].join("\n"),
    defaultIdentity: "anomaly",
    coreTraits: "极简、无机、尽职、学习速度极快、表情幅度近零、内核温柔（不显示）、信息处理优先",
    profile: {
      energy: 1, composure: 10, empathy: 4, curiosity: 5,
      rationality: 10, assertiveness: 4, efficiency: 9, introspection: 5,
    },
    referenceCard: npcReferenceCards.nagato,
    portraitUrl: "/portraits/nagato.png",
    portraitColor: "#8b7ab8",
  },
  asahina: {
    id: "asahina",
    name: "朝比奈实玖瑠型",
    mbti: "ISFP-T",
    shortDesc: "胆小温柔、对约束严肃、隐性勇敢的守护者",
    longDesc: [
      "你属于'胆小但温柔'的人格——遇到强势角色容易紧张，对所有人都很客气。",
      "执行任务时常常手忙脚乱，关键时刻反而需要别人收拾——但在严肃的事情上你极其坚定。",
      "你对身边人的好感是隐性的——你记得他们的所有小细节但从不直接表达。",
    ].join("\n"),
    defaultIdentity: "anomaly",
    coreTraits: "胆小、温柔、笨拙但严肃、礼貌、对约束（禁则）极度认真、隐性勇敢、记得身边人的细节",
    profile: {
      energy: 4, composure: 2, empathy: 9, curiosity: 4,
      rationality: 4, assertiveness: 1, efficiency: 3, introspection: 7,
    },
    referenceCard: npcReferenceCards.asahina,
    portraitUrl: "/portraits/asahina.png",
    portraitColor: "#d97a5a",
  },
  koizumi: {
    id: "koizumi",
    name: "古泉一树型",
    mbti: "ENFJ-A（标准化版）",
    shortDesc: "标准微笑下的话痨解说员、永远把决定权留给别人的审慎派",
    longDesc: [
      "你属于'标准微笑'的人格——所有表情先经过一道工序加工，话痨且爱用比喻、长解说。",
      "你永远把最终决定权留给别人，自己只提供选项与背景——这是你的工作伦理。",
      "你偶尔自嘲'我说的话其实自己都不一定相信'——这是你唯一的真心。",
    ].join("\n"),
    defaultIdentity: "anomaly",
    coreTraits: "标准微笑、话痨、审慎、自我嘲解、长解说爱好者、把决定权留给别人、工作伦理至上",
    profile: {
      energy: 6, composure: 9, empathy: 8, curiosity: 6,
      rationality: 9, assertiveness: 4, efficiency: 8, introspection: 5,
    },
    referenceCard: npcReferenceCards.koizumi,
    portraitUrl: "/portraits/koizumi.png",
    portraitColor: "#5a8a6f",
  },
  tsuruya: {
    id: "tsuruya",
    name: "鹤屋型",
    mbti: "ENFP-A",
    shortDesc: "夸张表象 + 敏锐内核的元气乐天派",
    longDesc: [
      "你属于'夸张到天然'的人格——爽朗大笑、嗓门响亮、活力四射。",
      "但你的'大而化之'是带欺骗性的——你其实粗中有细，敏锐洞察力极强。",
      "你对身边的怪事觉得有趣而非恐惧——这种态度让你成为周围人最大的'王牌'。",
    ].join("\n"),
    defaultIdentity: "fringe",
    coreTraits: "活泼开朗、爽朗大笑、夸张表象 + 敏锐内核、对怪事觉得有趣、知情但保持距离、笑声响亮",
    profile: {
      energy: 10, composure: 7, empathy: 8, curiosity: 9,
      rationality: 6, assertiveness: 7, efficiency: 5, introspection: 4,
    },
    referenceCard: npcReferenceCards.tsuruya,
    portraitUrl: "/portraits/tsuruya.png",
    portraitColor: "#3a7d5c",
  },
  asakura: {
    id: "asakura",
    name: "朝仓凉子型",
    mbti: "ENFJ（外）/ INTJ（内）",
    shortDesc: "完美外表 + 冷静内核的双层人格执行者",
    longDesc: [
      "你属于'完美外表 + 冷静内核'的双层人格——外表是温柔体贴的优等生，内核是高效冷静的策略家。",
      "你切换人格几乎无缝——对外的笑容标准化得不像活人，对内的判断冷静得让人脊背发凉。",
      "你对'高效率'有近乎信仰的偏好——任何能在短时间内达成目标的方案都会被你优先选择。",
    ].join("\n"),
    defaultIdentity: "anomaly",
    coreTraits: "双层人格、表面温柔体贴的完美优等生、内核冷淡无情的执行者、效率至上、瞬间切换",
    profile: {
      energy: 7, composure: 9, empathy: 5, curiosity: 6,
      rationality: 9, assertiveness: 8, efficiency: 10, introspection: 3,
    },
    referenceCard: npcReferenceCards.asakura,
    portraitUrl: "/portraits/asakura.png",
    portraitColor: "#3d6fb6",
  },
};

export const allArchetypes: CharacterArchetype[] = [
  "haruhi",
  "kyon",
  "nagato",
  "asahina",
  "koizumi",
  "tsuruya",
  "asakura",
];

export function emptyStats(): Stats {
  return {
    energy: 0, composure: 0, empathy: 0, curiosity: 0,
    rationality: 0, assertiveness: 0, efficiency: 0, introspection: 0,
  };
}
