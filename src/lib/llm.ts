// LLM 适配层：mock 优先，真实 API 留口
//
// 接口签名稳定为 callLLM(messages, sampling) → assistantText
// MVP 阶段用 mockLLM 返回拼好的 <event_json> 文本，保证完整闭环。
// 后续替换为真实 chat completion 调用即可（OpenAI / Claude / 本地 LLM 同 ChatML 模式）。

import type { ChatMessage, StoryTurn } from "@/types/turn";
import type { SamplingParams } from "@/types/preset";
import type { WorldState } from "@/types/worldState";

export type LLMCall = (
  messages: ChatMessage[],
  sampling: SamplingParams,
) => Promise<string>;

// ------------------------------------------------------------------
// 解析：从 assistant 文本里抽出结构化 JSON。
// 三档兜底，因为不同模型对自定义标签遵循度差异很大：
//   ① <event_json>...</event_json>（设计协议）
//   ② ```json ... ``` 代码块
//   ③ 文本里第一个看起来完整的 { ... } 对象
// ------------------------------------------------------------------

const EVENT_JSON_RE = /<event_json>([\s\S]*?)<\/event_json>/i;
const FENCED_JSON_RE = /```(?:json)?\s*([\s\S]*?)\s*```/i;

function tryParse(s: string): unknown | null {
  try { return JSON.parse(s); } catch { return null; }
}

function extractBareJsonObject(text: string): unknown | null {
  // 找第一个 { ，再用花括号配对找到对应的 }
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inStr = false; }
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return tryParse(text.slice(start, i + 1));
    }
  }
  return null;
}

export function parseEventJson(text: string): StoryTurn | null {
  let obj: unknown | null = null;

  // ① 标签形式
  const tagged = text.match(EVENT_JSON_RE);
  if (tagged) obj = tryParse(tagged[1].trim());

  // ② markdown 代码块
  if (!obj) {
    const fenced = text.match(FENCED_JSON_RE);
    if (fenced) obj = tryParse(fenced[1].trim());
  }

  // ③ 文本里第一个完整对象
  if (!obj) obj = extractBareJsonObject(text);

  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.eventTitle !== "string") return null;
  if (typeof o.narration !== "string") return null;
  if (!Array.isArray(o.choices)) return null;

  // pace / timeAdvance / requiresChoice 的兜底默认值——若 LLM 没填，按"日常 summary"处理
  const pace: StoryTurn["pace"] = o.pace === "scene" ? "scene" : "summary";
  const ta = (o.timeAdvance ?? {}) as Partial<StoryTurn["timeAdvance"]>;
  const timeAdvance: StoryTurn["timeAdvance"] = {
    days: typeof ta.days === "number" ? ta.days : undefined,
    hours: typeof ta.hours === "number" ? ta.hours : undefined,
    minutes: typeof ta.minutes === "number" ? ta.minutes : undefined,
    note: typeof ta.note === "string" ? ta.note : undefined,
  };
  // 若 LLM 完全没给时间推进——summary 默认 1 天；scene 默认 30 分钟
  if (
    timeAdvance.days === undefined &&
    timeAdvance.hours === undefined &&
    timeAdvance.minutes === undefined
  ) {
    if (pace === "summary") timeAdvance.days = 1;
    else timeAdvance.minutes = 30;
  }
  const requiresChoice =
    typeof o.requiresChoice === "boolean" ? o.requiresChoice : false;
  const rawChoices = (o.choices as string[]) ?? [];
  const choices = requiresChoice
    ? rawChoices.filter((c) => typeof c === "string").slice(0, 4)
    : [];

  return {
    eventTitle: o.eventTitle,
    scene: typeof o.scene === "string" ? o.scene : "",
    time: typeof o.time === "string" ? o.time : "",
    mood: typeof o.mood === "string" ? o.mood : "",
    narration: o.narration,
    dialogue: Array.isArray(o.dialogue) ? (o.dialogue as StoryTurn["dialogue"]) : [],
    stateChanges: (o.stateChanges as StoryTurn["stateChanges"]) ?? {},
    pace,
    timeAdvance,
    requiresChoice,
    choices,
    chain: o.chain as StoryTurn["chain"],
  };
}

// ------------------------------------------------------------------
// Fallback turn：解析失败时给一个不破坏体验的占位事件
// 同时把 LLM 的原始输出截一段塞进 narration，方便用户/开发者直接看到模型实际说了什么
// ------------------------------------------------------------------

export function fallbackTurn(reason = "AI 输出无法解析", raw?: string): StoryTurn {
  const preview = raw
    ? `\n\n[LLM 原始输出预览（共 ${raw.length} 字）]\n${raw.slice(0, 1500)}${raw.length > 1500 ? "……（剩余已截断）" : ""}`
    : "";
  return {
    eventTitle: "叙事暂时停顿",
    scene: "未知",
    time: "—",
    mood: "停滞",
    narration: `（${reason}。空气里出现一道短暂的停顿，世界正在重新对焦。）${preview}`,
    dialogue: [],
    stateChanges: {},
    pace: "scene",
    timeAdvance: {},
    requiresChoice: true,
    choices: ["重试本轮", "尝试主动开口", "检查 LLM 设置"],
  };
}

// ------------------------------------------------------------------
// Mock LLM：根据最后一条 user 消息与 Author's Note 编出一段合理输出
// 用于演示完整闭环。把它当成"AI 还没接好之前的胶水"。
// ------------------------------------------------------------------

type Pov = "kyon" | "haruhi";

// promptRouter 把 [POV] 角色名 钉在第一条 system 消息的第一行——这里直接抓行首。
function detectPov(messages: ChatMessage[]): Pov {
  const first = messages.find((m) => m.role === "system")?.content ?? "";
  const tag = first.match(/^\[POV\]\s*([^\n]+)/)?.[1].trim() ?? "";
  if (tag === "凉宫春日") return "haruhi";
  if (tag === "阿虚") return "kyon";
  // 兜底：含中文名也算
  if (tag.includes("凉宫春日") || tag.includes("春日")) return "haruhi";
  if (tag.includes("阿虚")) return "kyon";
  // 最后兜底：找不到 POV 就按"你扮演"判定
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  return /你扮演.{0,10}凉宫春日/.test(sys) ? "haruhi" : "kyon";
}

export const mockLLM: LLMCall = async (messages) => {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const sysTail = [...messages].reverse().find((m) => m.role === "system")?.content ?? "";
  const pov = detectPov(messages);

  const inChain = /事件链 .+ 第/.test(sysTail);
  const isFirstTurn = !messages.some((m) => m.role === "assistant");

  if (isFirstTurn) {
    return wrap(firstSceneTurn(pov, sysTail));
  }
  if (inChain) {
    return wrap(supernaturalTurn(pov, lastUser));
  }
  if (/电脑|社刊|广播|门牌/.test(lastUser)) {
    return wrap(anomalyHintTurn(pov, lastUser));
  }
  return wrap(dailyTurn(pov, lastUser));
};

function wrap(turn: Partial<StoryTurn> & Pick<StoryTurn, "eventTitle" | "narration">): string {
  // mock factory 写起来更简洁——pace/timeAdvance/requiresChoice 在这里补默认值
  const filled: StoryTurn = {
    scene: "",
    time: "",
    mood: "",
    dialogue: [],
    stateChanges: {},
    choices: [],
    pace: "summary",
    timeAdvance: { days: 1 },
    requiresChoice: false,
    ...turn,
  } as StoryTurn;
  return `<event_json>\n${JSON.stringify(filled, null, 2)}\n</event_json>`;
}

// 简化 mock factory 类型——只要必填字段，pace/timeAdvance/requiresChoice/dialogue/stateChanges 由 wrap 兜底
type MockTurn = Partial<StoryTurn> & Pick<StoryTurn, "eventTitle" | "narration">;

// ---- 第一人称叙述：阿虚 POV ----
const kyonScenes = {
  firstEntrance: (): MockTurn => ({
    eventTitle: "入学日的红丝带",
    scene: "一年五班教室",
    time: "上午第一节课前",
    mood: "尴尬中带着好奇",
    narration:
      "我把书包扔到窗边倒数第二排——这是黑板座位表分给我的位置。" +
      "刚坐下，背后传来桌椅挪动的声响。我没必要回头，余光也能看到一抹红——一个扎红丝带的女生在我后面落座。" +
      "她眉头微蹙，连'初次见面'该有的那点客套都嫌麻烦。这种气场，我大概一辈子也学不会。",
    dialogue: [{ speaker: "凉宫春日", mood: "敷衍", text: "……早。" }],
    stateChanges: {
      haruhiSatisfactionDelta: 0,
      playerStressDelta: 2,
      addClues: ["凉宫春日坐在我后排"],
    },
    choices: [
      "回头礼貌问候",
      "假装没听见，继续整理书包",
      "试探性地问她叫什么名字",
    ],
  }),
  firstSosFounded: (): MockTurn => ({
    eventTitle: "部室里那台温热的电脑",
    scene: "文艺部部室",
    time: "放学后",
    mood: "兴奋中带着不安",
    narration:
      "我推开部室的门，那股旧书加木地板的气味准时迎面而来。" +
      "角落里，那台从电研社讹来的电脑还在嗡嗡作响——主机壳是温的，我用手背蹭了一下就知道。" +
      "凉宫单手撑着桌面眯眼盯屏幕，像在审讯它。长门照旧坐窗边没合上书。朝比奈正给每个人倒茶，茶杯有点抖。" +
      "我在心里叹了口气：这就是我的放学后了。",
    dialogue: [
      { speaker: "凉宫春日", mood: "兴奋", text: "我宣布——SOS 团第一份调查任务，从今天开始！" },
      { speaker: "朝比奈实玖瑠", mood: "弱弱", text: "凉、凉宫同学……我们要做什么？" },
    ],
    stateChanges: {
      haruhiSatisfactionDelta: 5,
      playerStressDelta: 3,
      addClues: ["春日宣布要开始'调查任务'"],
    },
    choices: [
      "提议先去校园里找'七大不可思议'",
      "拉古泉过来缓和气氛",
      "假装没听见，给朝比奈打掩护",
    ],
  }),
  daily: (userInput: string): MockTurn => ({
    eventTitle: "放学后的走廊",
    scene: "教学楼走廊",
    time: "放学后",
    mood: "黄昏的散漫",
    narration:
      "夕阳从走廊尽头切进来，把每一格地砖都染成橘色。" +
      `我刚刚（${truncate(userInput, 28)}）的动作只在空气里留了一秒余响，` +
      "下一秒就被远处篮球落地的钝响盖过。这种放学后的散漫感，我承认我喜欢。",
    dialogue: [{ speaker: "谷口", mood: "懒散", text: "喂、阿虚，今天部室那边还去吗？" }],
    stateChanges: { playerStressDelta: -2 },
    choices: ["答应去部室", "找借口先回家", "反问谷口为什么这么关心"],
  }),
  anomalyHint: (userInput: string): MockTurn => ({
    eventTitle: "旧电脑的异常启动",
    scene: "文艺部部室",
    time: "放学后",
    mood: "日常中混入不安",
    narration:
      `就在我（${truncate(userInput, 24)}）的瞬间——角落那台旧电脑屏幕在没人触碰的情况下亮了起来。` +
      "硬盘指示灯安静得过分。我下意识看长门，她没有抬头，只是把书页轻轻翻过一页。这反而让我更不安。",
    dialogue: [
      { speaker: "凉宫春日", mood: "兴奋", text: "看吧！我就说今天一定会发生什么！" },
      { speaker: "长门有希", mood: "平静", text: "……" },
    ],
    stateChanges: {
      haruhiSatisfactionDelta: 4,
      worldStabilityDelta: -3,
      playerStressDelta: 4,
      addClues: ["旧电脑在无输入时自启动"],
      addFlags: ["computer_awake"],
    },
    choices: ["凑近屏幕看显示了什么", "让长门检查电脑日志", "让春日先冷静下来"],
  }),
  supernatural: (userInput: string): MockTurn => ({
    eventTitle: "灰色街道的呼吸",
    scene: "闭锁空间",
    time: "—",
    mood: "失真的静谧",
    narration:
      "声音被剥离了，只剩下我自己的呼吸。地面有种不该出现的弹性。" +
      `我（${truncate(userInput, 24)}）——这层冷蓝灰里我的动作显得过于真实。` +
      "远处楼宇之间，一道蓝色轮廓正在缓慢站起来。我下意识把手掌按在自己胸口，确认心跳还在。",
    dialogue: [{ speaker: "古泉一树", mood: "客气而紧绷", text: "请退后。这次的'神人'体型偏大。" }],
    stateChanges: { worldStabilityDelta: -5, playerStressDelta: 6 },
    choices: ["退到古泉身后观战", "试着用无线电联系外面", "走向前——我想看清神人的脸"],
    chain: { id: "closed_space", step: 2, totalSteps: 4 },
  }),
};

// ---- 第一人称叙述：凉宫春日 POV ----
const haruhiScenes = {
  firstEntrance: (): MockTurn => ({
    eventTitle: "我的开场宣言",
    scene: "一年五班教室",
    time: "上午第一节课前",
    mood: "宣战式的开场",
    narration:
      "我把书包砸在桌上——这就是我对北高这三年的开场白。" +
      "「我对普通的人类没有兴趣！如果你们之中有外星人、未来人、异世界人、超能力者的话，就直接来找我吧！」" +
      "教室一片死寂。我才懒得管这些'普通'同学的反应。" +
      "前面那个男生（座位表说他叫阿虚？这名字怎么回事）回过头来呆呆看我，活像被点名。" +
      "哼，至少有点反应。我'啪'地坐下，开始等今天放学。",
    dialogue: [{ speaker: "阿虚", mood: "呆滞", text: "……（这家伙到底想干嘛。）" }],
    stateChanges: {
      haruhiSatisfactionDelta: 5,
      playerStressDelta: -3,
      addFlags: ["self_intro_done"],
      addClues: ["前排那个'阿虚'似乎对我有反应"],
    },
    choices: [
      "戳一下前排那家伙的背，问他名字",
      "无视所有人，开始想下个计划",
      "扫视教室，挑出有趣的人选",
    ],
  }),
  firstSosFounded: (): MockTurn => ({
    eventTitle: "我的部室，我的电脑",
    scene: "文艺部部室",
    time: "放学后",
    mood: "得意",
    narration:
      "门一推开，部室的木味就扑了过来——这是我的领地，从今天起。" +
      "桌角那台从电研社抢过来的电脑还在嗡嗡转，我用手指敲了一下机壳，温的——很好。" +
      "长门坐在窗边一动不动，她从来不说话，但我知道她在听。朝比奈在给大家倒茶，杯子在抖，可爱。" +
      "古泉一树戴着那副标准化笑容，挺好用。" +
      "至于那个被我拽进来的阿虚——他正在叹气。叹什么气，他不懂自己有多幸运。",
    dialogue: [
      { speaker: "朝比奈实玖瑠", mood: "弱弱", text: "凉、凉宫同学……我们要做什么？" },
      { speaker: "古泉一树", mood: "标准微笑", text: "我也很好奇团长今天的安排。" },
    ],
    stateChanges: {
      haruhiSatisfactionDelta: 8,
      playerStressDelta: -2,
      addClues: ["朝比奈泡的茶今天有点抖"],
    },
    choices: [
      "宣布去找'校园七大不可思议'",
      "把阿虚拽过来当跑腿",
      "盯着长门看——她总有点不一样",
    ],
  }),
  daily: (userInput: string): MockTurn => ({
    eventTitle: "我对放学后的判决",
    scene: "教学楼走廊",
    time: "放学后",
    mood: "不耐烦",
    narration:
      "夕阳又是夕阳，走廊又是走廊。" +
      `刚才我（${truncate(userInput, 24)}）——这种小事根本无法满足我，` +
      "但每天总得有人记录'今天没有外星人来找我'这种事实。我把手插进裙子口袋，开始想下一个能让世界热闹起来的计划。",
    dialogue: [{ speaker: "谷口", mood: "倒霉", text: "凉、凉宫，又怎么了？" }],
    stateChanges: { haruhiSatisfactionDelta: -3, playerStressDelta: 0 },
    choices: [
      "把谷口拽来当陪练",
      "往部室走，说不定今天会有事",
      "宣布周末搞一次大行动",
    ],
  }),
  anomalyHint: (userInput: string): MockTurn => ({
    eventTitle: "我就说今天会有事！",
    scene: "文艺部部室",
    time: "放学后",
    mood: "兴奋",
    narration:
      `我刚刚（${truncate(userInput, 24)}），话音还没落——` +
      "角落那台破电脑，没有人碰它，屏幕'啪'一下就亮了。我心跳直接快了半拍：终于！终于来一点不一样的东西了！" +
      "我余光扫向长门，她还在看书，连眼皮都没抬——切，反应这么淡，等会要骂她。",
    dialogue: [
      { speaker: "阿虚", mood: "警觉", text: "……喂，凉宫。这是不是有点不太对劲？" },
      { speaker: "长门有希", mood: "平静", text: "……" },
    ],
    stateChanges: {
      haruhiSatisfactionDelta: 8,
      worldStabilityDelta: -3,
      playerStressDelta: -2,
      addClues: ["旧电脑在没人碰的情况下自己亮了"],
      addFlags: ["computer_awake"],
    },
    choices: [
      "扑过去看屏幕显示什么",
      "命令阿虚去拆开主机",
      "拍桌子宣布'调查开始'",
    ],
  }),
  supernatural: (userInput: string): MockTurn => ({
    eventTitle: "这片灰色的世界",
    scene: "看起来像是城里某条街，但是颜色不对",
    time: "—",
    mood: "兴奋到发冷",
    narration:
      "声音消失了。整条街变成蓝灰色，像被人把颜色调低了。我的耳朵听得见自己的呼吸，听不见别的。" +
      `我（${truncate(userInput, 24)}），脚下地面居然有一点弹性，` +
      "踩起来像是踩在某种活物上。远处楼之间，有个巨大的蓝色身影正在站起来——巨大、缓慢、漂亮得令人不安。" +
      "我承认：我现在心跳在加速，但不是害怕。是开心。",
    dialogue: [
      { speaker: "阿虚", mood: "紧张", text: "凉宫——这地方不对劲，你别往前走！" },
    ],
    stateChanges: {
      haruhiSatisfactionDelta: 6,
      worldStabilityDelta: -5,
      playerStressDelta: 2,
    },
    choices: [
      "无视阿虚，继续向前",
      "回头看看身后还有谁",
      "对着远处那个大块头喊一声",
    ],
    chain: { id: "closed_space", step: 2, totalSteps: 4 },
  }),
};

function firstSceneTurn(pov: Pov, sysTail: string): MockTurn {
  const inSosFounded = /SOS 团创立周/.test(sysTail);
  const set = pov === "haruhi" ? haruhiScenes : kyonScenes;
  return inSosFounded ? set.firstSosFounded() : set.firstEntrance();
}

function dailyTurn(pov: Pov, userInput: string): MockTurn {
  return (pov === "haruhi" ? haruhiScenes : kyonScenes).daily(userInput);
}

function anomalyHintTurn(pov: Pov, userInput: string): MockTurn {
  return (pov === "haruhi" ? haruhiScenes : kyonScenes).anomalyHint(userInput);
}

function supernaturalTurn(pov: Pov, userInput: string): MockTurn {
  return (pov === "haruhi" ? haruhiScenes : kyonScenes).supernatural(userInput);
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

// ------------------------------------------------------------------
// 真实 LLM 路由：根据 settings.provider 切换 provider
// ------------------------------------------------------------------

import { openAICompatibleLLM, anthropicLLM, withRetry } from "./llmProviders";
import { loadSettings } from "./settings";
import type { LLMSettings } from "./settings";

export function buildLLM(settings: LLMSettings): LLMCall {
  if (settings.provider === "mock") return mockLLM;
  if (settings.provider === "anthropic") return withRetry(anthropicLLM(settings));
  return withRetry(openAICompatibleLLM(settings));
}

// 可由 UI 切换；默认从 localStorage 读
export let activeLLM: LLMCall = buildLLM(loadSettings());

export function setLLM(impl: LLMCall) {
  activeLLM = impl;
}

// 给 SettingsModal 用：保存配置后自动重建 activeLLM
export function refreshLLM(settings: LLMSettings): void {
  activeLLM = buildLLM(settings);
}

// 给 UI 用的高层封装：完整一次调用并保底解析
export async function runLLM(opts: {
  messages: ChatMessage[];
  sampling: SamplingParams;
  state?: WorldState;
}): Promise<{ raw: string; turn: StoryTurn }> {
  try {
    const raw = await activeLLM(opts.messages, opts.sampling);
    const parsed = parseEventJson(raw);
    if (!parsed) {
      // 开发者控制台保留完整输出，便于排查
      console.warn("[runLLM] 解析失败，原始输出：", raw);
    }
    const turn = parsed ?? fallbackTurn("AI 输出未通过 JSON 校验", raw);
    return { raw, turn };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { raw: "", turn: fallbackTurn(`LLM 调用失败：${msg}`) };
  }
}

// 简单文本调用（不要求 <event_json>），用于摘要 / 结局小传 / 随机角色卡
export async function runLLMText(opts: {
  messages: ChatMessage[];
  sampling: SamplingParams;
}): Promise<string> {
  return activeLLM(opts.messages, opts.sampling);
}
