// 凉宫春日风味 MBTI 测试 · 10 道题（v8 · 7 原型 + 余弦相似度版）
//
// 设计原则：
//   - 题目场景【贴近真实玩家】，温和注入凉宫氛围
//   - 删除 sasaki 后剩 7 个原型；轮换表里每个原型在 10 题中出现 5-6 次
//   - 每选项 deltas 严格按目标原型 profile 高分维度投影
//   - 匹配算法已切换到余弦相似度——衡量"形状对齐"而非"距离"，让邻近原型也能精确区分
//
// 轮换表（每题 4 个原型出现）：
//   Q1: haruhi · nagato · asahina · asakura
//   Q2: haruhi · kyon    · koizumi · asakura
//   Q3: kyon   · nagato  · koizumi · tsuruya
//   Q4: haruhi · asahina · tsuruya · asakura
//   Q5: kyon   · nagato  · tsuruya · asakura
//   Q6: haruhi · asahina · koizumi · kyon
//   Q7: kyon   · asahina · asakura · tsuruya
//   Q8: nagato · koizumi · tsuruya · haruhi
//   Q9: haruhi · nagato  · koizumi · asakura
//   Q10: kyon  · asahina · tsuruya · koizumi
//
// 各原型出现次数：haruhi 6 / kyon 6 / nagato 5 / asahina 5 / koizumi 6 / tsuruya 6 / asakura 6

import type { Stats } from "./characterArchetypes";

export type QuizOption = {
  text: string;
  deltas: Partial<Stats>;
};

export type QuizQuestion = {
  id: number;
  scene: string;
  prompt: string;
  options: QuizOption[]; // 必须 4 个
};

// ============================================================
// 8 原型的标签 deltas——按 profile 高分维度投影 + 关键 1-2 个次要维度
// 加上次要维度是为了让原型 profile 形状更完整地体现，避免被"邻近原型"吸走
// ============================================================

// deltas 设计原则：
//   1) 主轴 = 该原型 profile 中的高分维度（≥7）—— 加 2-3 分
//   2) 差异维度 = 该原型与"邻近原型"区分的关键维度——加重投影
//   3) 共享维度 = 与邻近原型重叠的维度——保持轻量加分（让玩家累计但不主导）
const HARUHI_DELTAS: Partial<Stats> = {
  energy: 3, assertiveness: 3, curiosity: 2,
}; // 主：ene10/ass10/cur9；不加 emp/com（vs tsuruya 差异）
const KYON_DELTAS: Partial<Stats> = {
  introspection: 3, empathy: 2, rationality: 2, composure: 1,
}; // 主：int9/emp7/rat7/com6
const NAGATO_DELTAS: Partial<Stats> = {
  composure: 3, rationality: 3, efficiency: 2,
}; // 主：com10/rat10/eff9；纯净不加其他
const ASAHINA_DELTAS: Partial<Stats> = {
  empathy: 3, introspection: 2, composure: 1,
}; // 主：emp9/int7
const KOIZUMI_DELTAS: Partial<Stats> = {
  empathy: 3, rationality: 2, efficiency: 2, composure: 1, curiosity: 1,
}; // 主：emp8/rat9/eff8/com9；加 cur:1 让 koizumi 玩家有 cur 累计（vs nagato 无 cur）
const TSURUYA_DELTAS: Partial<Stats> = {
  energy: 2, curiosity: 2, empathy: 2, composure: 1, assertiveness: 1,
}; // 主：ene10/cur9/emp8/com7/ass7
const ASAKURA_DELTAS: Partial<Stats> = {
  efficiency: 3, assertiveness: 2, composure: 2, rationality: 2, energy: 1,
}; // 主：eff10/com9/rat9/ass8/ene7；ene 加 1 让 asakura 有 ene 累计（vs nagato 无 ene）

export const mbtiQuiz: QuizQuestion[] = [
  // Q1：haruhi · nagato · asahina · asakura
  {
    id: 1,
    scene: "开学第一天 · 隔壁桌的怪人",
    prompt:
      "开学第一天午餐时间。隔壁桌一个看上去很奇怪的女生突然站起来宣布——「我对普通的午餐没兴趣，谁愿意陪我去吃今天最有趣的东西？」她的目光扫过来。你？",
    options: [
      { text: "立刻拍桌站起来：「那当然算我一个，我们走！」", deltas: HARUHI_DELTAS },
      { text: "面无表情扒饭，目光不动——这件事在统计上无意义", deltas: NAGATO_DELTAS },
      { text: "对她温柔一笑，但低下头继续吃——「她应该会找到伙伴的」", deltas: ASAHINA_DELTAS },
      { text: "在脑子里飞速估算：去 / 不去的得失比，决断后立刻执行", deltas: ASAKURA_DELTAS },
    ],
  },
  // Q2：haruhi · kyon · koizumi · asakura
  {
    id: 2,
    scene: "被打断的专注",
    prompt:
      "你正在专心做一件你认为很重要的事。朋友突然冲进来：「快！跟我走！我刚发现了超级有趣的东西！」（他没说是什么。）你？",
    options: [
      { text: "「好啊先去再说！」笔一扔，跟着冲出去", deltas: HARUHI_DELTAS },
      { text: "嘟囔一句「真是的」，但还是叹气把笔放下，跟着出去", deltas: KYON_DELTAS },
      { text: "微笑着说：「先告诉我大概要花多长时间？我能配合你」", deltas: KOIZUMI_DELTAS },
      { text: "直接接管：「先做完我手头的事，再去你那件，效率最高」", deltas: ASAKURA_DELTAS },
    ],
  },
  // Q3：kyon · nagato · koizumi · tsuruya
  {
    id: 3,
    scene: "朋友的怪话",
    prompt:
      "好朋友突然认真地对你说：「我觉得这个世界假得像一个剧本——你不觉得吗？」你的第一反应？",
    options: [
      { text: "心里默默吐槽「你想得也太多了」，但还是耐心听他说下去", deltas: KYON_DELTAS },
      { text: "什么也不说，安静地坐到他身边，等他自己往下讲", deltas: NAGATO_DELTAS },
      { text: "温和地反问：「让你这样想的，是最近发生了什么具体的事吗？」", deltas: KOIZUMI_DELTAS },
      { text: "「哦哦哦那我们一起找证据啊！现在出发去寻找剧本破绽！」", deltas: TSURUYA_DELTAS },
    ],
  },
  // Q4：haruhi · asahina · tsuruya · asakura
  {
    id: 4,
    scene: "似有似无的怪事",
    prompt:
      "放学路上，你看见一件似有似无的小事——一段陌生旋律、一个逆光下的影子、一个似乎在跟你的微小光点。你？",
    options: [
      { text: "停下脚步——「不行，我得搞清楚！」转身就追", deltas: HARUHI_DELTAS },
      { text: "在心里温柔地记下，回家轻轻写进日记里", deltas: ASAHINA_DELTAS },
      { text: "「哦哦哦这个有意思！」哈哈大笑着掏出手机就开始追", deltas: TSURUYA_DELTAS },
      { text: "立刻列出排查清单：可能的物理来源 / 心理来源 / 排除项", deltas: ASAKURA_DELTAS },
    ],
  },
  // Q5：kyon · nagato · tsuruya · asakura
  {
    id: 5,
    scene: "小组里的位置",
    prompt: "小组项目刚开始。每个人都在等谁先开口。你最自然扮演的角色？",
    options: [
      { text: "嘴上抱怨「为什么又是我」，最后还是扛起整个项目", deltas: KYON_DELTAS },
      { text: "默默把自己分到的活高效做完，不参与争论也不抱怨", deltas: NAGATO_DELTAS },
      { text: "活力推动每个人——「来嘛！一起做超有趣的方案！」", deltas: TSURUYA_DELTAS },
      { text: "立刻接管：制定时间表、分工、里程碑——「按这个来，效率最高」", deltas: ASAKURA_DELTAS },
    ],
  },
  // Q6：haruhi · asahina · koizumi · kyon
  {
    id: 6,
    scene: "身边人的评价",
    prompt: "你最常被身边人形容为？",
    options: [
      { text: "「你怎么这么有活力 / 一刻也不停 / 决定的事谁都拦不住」", deltas: HARUHI_DELTAS },
      { text: "「你太温柔了 / 总在替别人着想 / 永远把最好的让给别人」", deltas: ASAHINA_DELTAS },
      { text: "「跟你说话很舒服 / 你太会照顾别人了 / 你嘴特别甜」", deltas: KOIZUMI_DELTAS },
      { text: "「你嘴上总是嫌麻烦，但每次都还是把事情扛下来」", deltas: KYON_DELTAS },
    ],
  },
  // Q7：kyon · asahina · asakura · tsuruya
  {
    id: 7,
    scene: "看似平凡的周末",
    prompt:
      "周末——又是一个看似平凡的日子，但你心里隐约有种「今天可能会发生什么」的预感。你？",
    options: [
      { text: "在家——预感大概只是错觉，没必要折腾，但还是有点忐忑", deltas: KYON_DELTAS },
      { text: "把这种预感写进日记，温柔地记下今天身边人的小事", deltas: ASAHINA_DELTAS },
      { text: "把今天可能发生的事列出来，再列出每种情况的应对方案", deltas: ASAKURA_DELTAS },
      { text: "「哈哈哈那咱就出门去蹲！」笑嘻嘻拉上朋友直奔人多的地方", deltas: TSURUYA_DELTAS },
    ],
  },
  // Q8：nagato · koizumi · tsuruya · haruhi
  {
    id: 8,
    scene: "朋友被冤枉",
    prompt: "好朋友被人在背后说坏话、被人误解。你？",
    options: [
      { text: "什么也不说，但默默站在朋友身边——让谁都看得见你的态度", deltas: NAGATO_DELTAS },
      { text: "私下找误解他的人喝杯东西聊聊——「我们把事说清楚」", deltas: KOIZUMI_DELTAS },
      { text: "「哇你说什么呢！」立刻冲上去当场为他大声辩护", deltas: TSURUYA_DELTAS },
      { text: "「这事到我这就是宣战！」当众宣告：从今往后谁动他我跟谁急", deltas: HARUHI_DELTAS },
    ],
  },
  // Q9：haruhi · nagato · koizumi · asakura
  {
    id: 9,
    scene: "你被吸引的角色",
    prompt: "在小说 / 影视 / 故事里，你最被哪种角色吸引？",
    options: [
      { text: "充满激情、推动一切发生的主角——「他们走到哪里哪里就有故事」", deltas: HARUHI_DELTAS },
      { text: "沉默寡言但深藏不露的智者——「每句话都有重量」", deltas: NAGATO_DELTAS },
      { text: "看似没在做主导、实则把每个人都照顾到的「调和者」", deltas: KOIZUMI_DELTAS },
      { text: "在背后冷静操盘、把一切都安排好的「完美执行者」", deltas: ASAKURA_DELTAS },
    ],
  },
  // Q10：kyon · asahina · tsuruya · koizumi
  {
    id: 10,
    scene: "10 分钟决定",
    prompt:
      "你必须在 10 分钟内做一个会影响接下来一整年的重大决定。你？",
    options: [
      { text: "在心里飞速推演几条路径，然后叹一口气选自己最不讨厌那条", deltas: KYON_DELTAS },
      { text: "立刻找最信任的人聊聊——但最终自己拍板，不让对方负责", deltas: ASAHINA_DELTAS },
      { text: "「啊那随便选一个吧——船到桥头自然直！」凭活力直接拍板", deltas: TSURUYA_DELTAS },
      { text: "把每个选项的「对身边人意味着什么」想清楚——按谁也不亏的方向选", deltas: KOIZUMI_DELTAS },
    ],
  },
];
