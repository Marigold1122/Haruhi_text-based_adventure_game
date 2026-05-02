// 凉宫春日风味 MBTI 测试 · 10 道题
//
// 设计原则：
//   - 题目场景【贴近真实玩家】（陌生班级、朋友难过、独处时光、重大决定），不直接照搬原作事件
//   - 但温和注入凉宫氛围（"今天可能会发生什么"的预感、"沉默寡言但深藏不露的智者"等）
//   - 选项是【真实玩家会做的反应】，不是某个角色的标志性动作
//   - 每个选项给 1-3 个参数加 1-4 分；归一化后与 8 个原型画像求最近距离

import type { Stats } from "./characterArchetypes";

export type QuizOption = {
  text: string;
  /** 该选项给玩家加的参数点数（每个值通常 1-4） */
  deltas: Partial<Stats>;
};

export type QuizQuestion = {
  id: number;
  scene: string;
  prompt: string;
  options: QuizOption[]; // 必须 4 个
};

export const mbtiQuiz: QuizQuestion[] = [
  {
    id: 1,
    scene: "陌生的午餐时间",
    prompt: "新学期分到一个完全陌生的班级。第一天午餐时间，你最可能怎么做？",
    options: [
      {
        text: "主动找一个看上去顺眼的人：“请问可以一起吃吗？”",
        deltas: { energy: 3, assertiveness: 3, empathy: 1 },
      },
      {
        text: "一个人安静地吃，顺便观察周围每个人的小动作",
        deltas: { composure: 3, introspection: 2, rationality: 1 },
      },
      {
        text: "等同桌主动开口，自己不强求——能聊就聊，不能聊就算了",
        deltas: { empathy: 2, composure: 3 },
      },
      {
        text: "边吃边在心里默默吐槽今天的菜——“这能算午饭？”",
        deltas: { introspection: 3, rationality: 2 },
      },
    ],
  },
  {
    id: 2,
    scene: "被打断的专注",
    prompt:
      "你正在专心做一件重要的事，朋友突然兴奋地拽你去做完全无关的事。你会？",
    options: [
      {
        text: "跟过去看看——反正闲着也是闲着",
        deltas: { empathy: 2, composure: 1 },
      },
      {
        text: "立刻拒绝：“我有事，下次再说”",
        deltas: { rationality: 2, assertiveness: 3, efficiency: 1 },
      },
      {
        text: "嘴上嘟囔“真是的”，但还是把手头的事一放跟着去了",
        deltas: { empathy: 2, introspection: 2 },
      },
      {
        text: "反过来兴奋地接管——“等等，让我来策划我们怎么做这件事！”",
        deltas: { energy: 4, assertiveness: 3, curiosity: 2 },
      },
    ],
  },
  {
    id: 3,
    scene: "朋友突然的眼泪",
    prompt:
      "好朋友突然在你面前哭了——是因为刚才和家人吵了一架。你的第一反应？",
    options: [
      {
        text: "立刻递纸巾、拍他的背：没事的没事的",
        deltas: { empathy: 4, assertiveness: 2 },
      },
      {
        text: "什么也不说，只是静静坐在旁边陪着",
        deltas: { empathy: 3, composure: 3 },
      },
      {
        text: "问清楚情况：“具体怎么了？我们一起想想怎么办”",
        deltas: { rationality: 3, composure: 1, empathy: 1 },
      },
      {
        text: "替他梳理一个具体可操作的方案：第一步、第二步……",
        deltas: { rationality: 3, efficiency: 3, empathy: 1 },
      },
    ],
  },
  {
    id: 4,
    scene: "放学路上的瞥见",
    prompt:
      "放学路上，你瞥见一个有点奇怪的现象——可能是一段陌生的旋律、一个不认识的字、或某个你说不清是不是真的看到了的小事。你？",
    options: [
      {
        text: "立刻打开手机搜——“必须搞清楚这是什么”",
        deltas: { curiosity: 4, efficiency: 2 },
      },
      {
        text: "心里默默记下，回家再慢慢研究",
        deltas: { curiosity: 3, introspection: 2 },
      },
      {
        text: "看一眼就忘了——大概只是错觉，没什么大不了",
        deltas: { composure: 2 },
      },
      {
        text: "突然想到一个完全不相关但有趣的联想，写进备忘录",
        deltas: { curiosity: 2, introspection: 3, rationality: 2 },
      },
    ],
  },
  {
    id: 5,
    scene: "团队里的角色",
    prompt: "小组项目里，你最自然扮演的角色是？",
    options: [
      {
        text: "提议下一步去哪——拍板的人",
        deltas: { energy: 3, assertiveness: 4, efficiency: 2 },
      },
      {
        text: "分析每个方案的利弊——参谋",
        deltas: { rationality: 4, introspection: 1 },
      },
      {
        text: "调和团队气氛、缓和争吵——润滑剂",
        deltas: { empathy: 4, composure: 2 },
      },
      {
        text: "默默把分到的活做完——执行者",
        deltas: { efficiency: 3, composure: 2, introspection: 1 },
      },
    ],
  },
  {
    id: 6,
    scene: "身边人对你的评价",
    prompt: "你最常被身边人形容为：",
    options: [
      {
        text: "“你怎么这么有活力 / 一刻也不停”",
        deltas: { energy: 4, assertiveness: 2 },
      },
      {
        text: "“你怎么总能想到这些 / 怎么知道这么多”",
        deltas: { rationality: 3, curiosity: 3 },
      },
      {
        text: "“你太温柔了 / 你总是替别人着想”",
        deltas: { empathy: 4, composure: 1 },
      },
      {
        text: "“你怎么这么淡定 / 一点也不见你紧张”",
        deltas: { composure: 4, introspection: 2 },
      },
    ],
  },
  {
    id: 7,
    scene: "看似平凡的周末",
    prompt:
      "周末——又是一个看似平凡的日子，但你心里隐约有种「今天可能会发生什么」的预感。你最可能怎么过？",
    options: [
      {
        text: "出门——逛街、见朋友、去一个没去过的地方探险",
        deltas: { energy: 4, curiosity: 2 },
      },
      {
        text: "在家看书 / 看电影 / 一个人独处，享受安静",
        deltas: { composure: 3, introspection: 2 },
      },
      {
        text: "整理房间 / 列下个月的计划 / 复盘最近的事",
        deltas: { efficiency: 3, introspection: 2, composure: 1 },
      },
      {
        text: "想做事但什么都做不下去——脑子里全是接下来要发生的事",
        deltas: { introspection: 4, empathy: 1 },
      },
    ],
  },
  {
    id: 8,
    scene: "朋友被冤枉",
    prompt: "你的好朋友被人误解、被人在背后说坏话。你会？",
    options: [
      {
        text: "立刻冲上去为他辩护",
        deltas: { energy: 2, empathy: 3, assertiveness: 3 },
      },
      {
        text: "私下找误解他的人解释，避免正面冲突",
        deltas: { empathy: 3, rationality: 2, composure: 2 },
      },
      {
        text: "先了解事情全貌再决定要不要出手",
        deltas: { rationality: 3, introspection: 2, composure: 2 },
      },
      {
        text: "私下安慰朋友，不主动出头——风波会自己过去",
        deltas: { empathy: 4, composure: 1 },
      },
    ],
  },
  {
    id: 9,
    scene: "你被吸引的角色",
    prompt:
      "在小说 / 影视 / 故事里，你最被哪种角色吸引？",
    options: [
      {
        text: "充满激情、推动一切发生的主角——他们走到哪里哪里就有故事",
        deltas: { energy: 3, assertiveness: 3, curiosity: 2 },
      },
      {
        text: "沉默寡言但深藏不露的智者——他们说话不多但每句都有重量",
        deltas: { composure: 3, rationality: 3, introspection: 2 },
      },
      {
        text: "温柔守护身边人的配角——不张扬但不可或缺",
        deltas: { empathy: 4, composure: 2 },
      },
      {
        text: "看似冷淡、其实最了解一切的旁观者",
        deltas: { composure: 3, introspection: 3, rationality: 2 },
      },
    ],
  },
  {
    id: 10,
    scene: "10 分钟的重大决定",
    prompt:
      "你必须在 10 分钟内做出一个会影响接下来一整年的重大决定。你会？",
    options: [
      {
        text: "凭第一感觉直接做——“想太多就什么都做不成”",
        deltas: { energy: 2, assertiveness: 3 },
      },
      {
        text: "列出所有可能性，逻辑分析利弊后选最优解",
        deltas: { rationality: 4, efficiency: 2 },
      },
      {
        text: "立刻找最信任的人问意见——但最终还是自己决定",
        deltas: { empathy: 3, composure: 1, introspection: 1 },
      },
      {
        text: "先深呼吸、把脑子放空，让答案自己浮现",
        deltas: { composure: 4, introspection: 3 },
      },
    ],
  },
];
