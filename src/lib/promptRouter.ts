// Prompt Router——本项目的核心架构价值。
//
// 职责：
//   1. 根据当前事件类型/身份/世界状态/事件链状态，选择 Preset 与世界书子集
//   2. 按酒馆标准 9 步顺序拼装 prompt：
//        ① Preset.system_prompt
//        ② 角色卡 description / personality / scenario
//        ③ 世界书 constant + 关键词触发命中条目（按 insertion_order 与 position 排序）
//        ④ 角色卡 mes_example（few-shot）
//        ⑤ 完整聊天历史 / 历事
//        ⑥ Summary（超长时启用——本样品先留口子）
//        ⑦ Author's Note（最高优先级，注入世界状态/身份/流速/事件链状态）
//        ⑧ 角色卡 post_history_instructions
//        ⑨ 当前用户输入 / 时间推进信号
//
// 输出：messages 数组（ChatML 风格），可直接喂给 OpenAI / Claude 等 chat completion API。

import type { CharacterCardV2 } from "@/types/character";
import type { Lorebook, LoreEntry } from "@/types/lorebook";
import type { Preset, EventPresetKind } from "@/types/preset";
import type { WorldState } from "@/types/worldState";
import type { ChatMessage } from "@/types/turn";

import { presetRegistry, chainPresets } from "@/data/presets";

// ------------------------------------------------------------------
// 1) Preset 选择
// ------------------------------------------------------------------

export function pickPreset(opts: {
  eventKind: EventPresetKind;
  state: WorldState;
}): Preset {
  // 事件链中：优先用该链的专属 Preset；找不到则回退 supernatural
  const chain = opts.state.activeChain;
  if (chain) {
    return chainPresets[chain.id] ?? presetRegistry.supernatural;
  }
  return presetRegistry[opts.eventKind] ?? presetRegistry.daily;
}

// ------------------------------------------------------------------
// 2) 世界书条目筛选
// ------------------------------------------------------------------
//
// 命中规则：
//   - constant：永远命中
//   - 关键词触发：scanText 中包含任一 keys（次关键词 selective + secondary_keys 同时命中）
//   - 身份门控：extensions.identity_gate 非空时，玩家身份必须在内
//   - 事件链门控：extensions.chain_id 非空时，必须当前激活该链

export function selectLoreEntries(opts: {
  lorebook: Lorebook;
  state: WorldState;
  scanText: string;     // 通常是最近 N 轮聊天 + 当前用户输入
}): LoreEntry[] {
  const { lorebook, state, scanText } = opts;
  const lower = scanText.toLowerCase();

  const passesIdentityGate = (e: LoreEntry): boolean => {
    const gate = e.extensions?.identity_gate;
    if (!gate || gate.length === 0) return true;
    return gate.includes(state.identity);
  };

  const passesChainGate = (e: LoreEntry): boolean => {
    const chainId = e.extensions?.chain_id;
    if (!chainId) return true;
    return state.activeChain?.id === chainId;
  };

  const matchesKey = (e: LoreEntry): boolean => {
    if (e.constant) return true;
    const test = (k: string) => {
      const needle = e.case_sensitive ? k : k.toLowerCase();
      const hay = e.case_sensitive ? scanText : lower;
      return hay.includes(needle);
    };
    const primary = e.keys.some(test);
    if (!primary) return false;
    if (e.selective && e.secondary_keys && e.secondary_keys.length > 0) {
      return e.secondary_keys.some(test);
    }
    return true;
  };

  return lorebook.entries
    .filter((e) => e.enabled)
    .filter(passesIdentityGate)
    .filter(passesChainGate)
    .filter(matchesKey)
    .sort((a, b) => (a.insertion_order ?? 0) - (b.insertion_order ?? 0));
}

// ------------------------------------------------------------------
// 3) Author's Note 模板填充
// ------------------------------------------------------------------

export function renderAuthorsNote(opts: {
  preset: Preset;
  state: WorldState;
  sceneCast?: string;
  timelineContext?: string;
  identityGuide?: string;
  canonFocus?: import("@/data/canonTimeline").CanonEvent;
}): string {
  const { preset, state, sceneCast, timelineContext, identityGuide, canonFocus } = opts;

  const worldStateBlock = [
    `· 春日满足度（隐藏）：${state.haruhiSatisfaction}`,
    `· 世界稳定度：${state.worldStability}`,
    `· 玩家压力：${state.playerStress}`,
    `· 已发现线索：${state.clues.length === 0 ? "无" : state.clues.join("、")}`,
    `· 关键标记：${state.flags.length === 0 ? "无" : state.flags.join("、")}`,
    `· 关系：${Object.values(state.relations)
      .map((r) => `${r.name}(${r.note ?? "—"})`)
      .join("，")}`,
  ].join("\n");

  const chainBlock = state.activeChain
    ? `· 事件链 ${state.activeChain.id} 第 ${state.activeChain.step}/${state.activeChain.totalSteps} 节${state.activeChain.endMarker ? `（结束标记：${state.activeChain.endMarker}）` : ""}${state.activeChain.notes ? `\n  备注：${state.activeChain.notes}` : ""}`
    : "· 不在事件链中";

  const sceneCastBlock = sceneCast ?? "（未配置 sceneCast）";
  const timelineBlock = timelineContext ?? "（未配置时间表）";
  const identityBlock = identityGuide ?? "（未配置身份指引）";

  const rendered = preset.authors_note_template
    .replace(/\{\{date\}\}/g, state.date.display)
    .replace(/\{\{flow\}\}/g, flowLabel(state.flow))
    .replace(/\{\{identity\}\}/g, identityLabel(state.identity))
    .replace(/\{\{world_state\}\}/g, worldStateBlock)
    .replace(/\{\{chain\}\}/g, chainBlock)
    .replace(/\{\{scene_cast\}\}/g, sceneCastBlock)
    .replace(/\{\{timeline\}\}/g, timelineBlock)
    .replace(/\{\{identity_guide\}\}/g, identityBlock);

  if (canonFocus) {
    return [
      rendered,
      "",
      renderCanonFocusBlock(canonFocus, state.identity),
    ].join("\n");
  }
  return rendered;
}

/** 把强制触发的 canon event 渲染成"本轮必须叙述的焦点"块。原作时间线硬约束 + 玩家自由度并存。 */
function renderCanonFocusBlock(
  e: import("@/data/canonTimeline").CanonEvent,
  identity: WorldState["identity"],
): string {
  return [
    "[Canon Focus · 本轮必须叙述的原作主线事件]",
    `事件：${e.title}（${e.date.iso}）`,
    `卷次：第 ${e.volume} 卷`,
    e.location ? `地点：${e.location}` : "",
    `涉及角色：${e.participants.join("、")}`,
    `事件概要：${e.summary}`,
    `主线作用：${e.narrativeFunction}`,
    "",
    "【硬约束 · 事件本体不可改变】",
    "  · 这一事件在原作中就发生于今天此刻，不容跳过、不容错位、不容篡改其客观结果",
    "  · 关键事实（谁说了什么宣言、谁加入了团、谁救了谁、世界是否被改写）必须保持原作走向",
    "",
    "【自由度 · 玩家如何参与高度可变】",
    "  · canon = 事件的客观发生 + 关键结果；自由度 = 玩家如何进入场景、如何反应、看到多少、之后做什么",
    "  · 玩家可以从多角度切入：身处现场 / 路过隔壁班 / 听到走廊回响 / 事后从八卦得知；反应方式自由（旁观 / 凑近 / 主动搭话 / 装作没看见 / 找朋友议论）",
    "  · 副线行为不改变 canon 走向，但有真实后果：决定玩家的人际网与未来 identity 升级路径",
    "",
    "【慢镜头展开 · canon 事件应跨多个短批次】",
    "  · canon 事件是玩家熟悉、期待的高潮节点——不要在一个批次里草草带过，应慢镜头分多批展开",
    "  · 每批 narrations **4-8 段**（比日常 12-18 段更短），让玩家在同一 canon 事件里得到 3-6 次互动机会",
    "  · 每批以一个交互收尾，但分量可大可小：",
    "    - 大部分是【轻交互】（如何反应 / 看哪里 / 说什么 / 要不要起身），影响人际细节但不改变 canon",
    "    - 关键节点才是【真分支】（是否主动接近春日 / 是否相信春日），决定后续 identity 与人际起点",
    "  · 一个 canon 事件场景：轻交互占多数 3-5 次，真分支只在关键转折出现 1-2 次",
    "",
    "【批末选项必须有真实差异】",
    "  · choices 不要写「围观 / 沉默 / 等等看」这种装饰性空选项",
    "  · 即使是轻交互，每个选项也要对应不同的下一批开场（不同 NPC 反应 / 不同细节 / 不同氛围）",
    "",
    `玩家身份=${identity}（visibility=${e.visibility}）：超自然事件对路人玩家间接呈现，不得直接命名「闭锁空间 / 思念体 / 神人」等术语。`,
  ].filter(Boolean).join("\n");
}

function flowLabel(flow: WorldState["flow"]): string {
  return {
    monthly: "1 次 1 月",
    biweekly: "1 次 2 周",
    weekly: "1 次 1 周",
    chain: "事件链节奏",
  }[flow];
}

function identityLabel(identity: WorldState["identity"]): string {
  return {
    passerby: "路人学生",
    fringe: "SOS 团边缘人物",
    core: "SOS 团核心成员",
    anomaly: "异常存在",
    observer: "观察者 / 操控者",
  }[identity];
}

// ------------------------------------------------------------------
// 4) 主装配：按酒馆 9 步顺序拼成 messages
// ------------------------------------------------------------------

export type AssembledPrompt = {
  messages: ChatMessage[];
  // 调试用：暴露每步实际注入的内容，方便在开发面板里看
  trace: {
    presetName: string;
    activeLoreEntries: string[];
    authorsNote: string;
  };
};

export function assemblePrompt(opts: {
  card: CharacterCardV2;
  lorebook: Lorebook;
  preset: Preset;
  state: WorldState;
  history: ChatMessage[];        // 完整聊天历史（不含本轮 user）
  summary?: string | null;       // 滚动摘要（可选）
  userInput: string;             // 本轮玩家行动 / 推进信号
  sceneCast?: string;            // 本轮场景人员清单（高优先级注入）
  timelineContext?: string;      // 当前日期附近的 SOS 团世界事件
  identityGuide?: string;        // 当前身份对应的剧情指引
  canonFocus?: import("@/data/canonTimeline").CanonEvent;
}): AssembledPrompt {
  const { card, lorebook, preset, state, history, summary, userInput, sceneCast, timelineContext, identityGuide, canonFocus } = opts;
  const cardData = card.data;

  // 取最近 N 轮文本作为关键词扫描素材（含本轮输入）
  const scanText = [
    ...history.slice(-6).map((m) => m.content),
    userInput,
  ].join("\n");

  const lore = selectLoreEntries({ lorebook, state, scanText });
  const loreBefore = lore.filter((e) => e.position !== "after_char");
  const loreAfter = lore.filter((e) => e.position === "after_char" || e.position === undefined);

  const authorsNote = renderAuthorsNote({ preset, state, sceneCast, timelineContext, identityGuide, canonFocus });

  // ===== ① + ② + ③(before_char) + ④ 合并到一条 system 消息 =====
  // 这是酒馆默认行为：char 描述与世界书 before_char 部分都属于"角色之前"的固定上下文。
  //
  // 顶部第一行显式打出 [POV]，明确单视角第一人称叙事的主角名——
  // 既给 LLM 看（强化第一人称约束），也给 mockLLM 的 detectPov 一个稳定锚点。
  const povHeader = `[POV] ${cardData.name}`;
  const systemHead = [
    povHeader,
    "本作为单视角第一人称叙事——所有 narration 必须以上述 POV 角色的第一人称（'我'）展开，不得切换视角。",
    section("[Preset · System Prompt]", mergeSystemPrompts(preset.system_prompt, cardData.system_prompt)),
    section("[Character · Description]", cardData.description),
    section("[Character · Personality]", cardData.personality),
    section("[Character · Scenario]", cardData.scenario),
    loreBefore.length > 0
      ? section("[World Info · Before Char]", loreBefore.map(formatLoreEntry).join("\n\n"))
      : "",
    section("[Character · Example Dialogue]", cardData.mes_example),
  ]
    .filter(Boolean)
    .join("\n\n");

  // ===== ⑤ 历史 / ⑥ 摘要 =====
  // 大窗口模型直接全塞历史；摘要作为额外 system 消息插在前面。
  const messages: ChatMessage[] = [];
  messages.push({ role: "system", content: systemHead });

  if (summary) {
    messages.push({
      role: "system",
      content: section("[Rolling Summary]", summary),
    });
  }

  for (const m of history) {
    messages.push({ role: m.role, content: m.content });
  }

  // ===== ③(after_char) + ⑦ Author's Note + ⑧ post_history_instructions =====
  // 这一组属于"高优先级临时注入"，统一放在历史之后、用户输入之前的 system 消息里。
  const systemTail = [
    loreAfter.length > 0
      ? section("[World Info · After Char]", loreAfter.map(formatLoreEntry).join("\n\n"))
      : "",
    section("[Author's Note]", authorsNote),
    cardData.post_history_instructions
      ? section("[Post-history Instructions]", cardData.post_history_instructions)
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (systemTail) {
    messages.push({ role: "system", content: systemTail });
  }

  // ===== ⑨ 当前用户输入 / 时间推进信号 =====
  messages.push({ role: "user", content: userInput });

  return {
    messages,
    trace: {
      presetName: preset.name,
      activeLoreEntries: lore.map((e) => e.name ?? e.keys[0] ?? "(unnamed)"),
      authorsNote,
    },
  };
}

// ------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------

function mergeSystemPrompts(presetPrompt: string, charPrompt: string): string {
  if (!charPrompt.trim()) return presetPrompt;
  return [presetPrompt, "[Character system_prompt]", charPrompt].join("\n\n");
}

function formatLoreEntry(e: LoreEntry): string {
  const head = e.name ? `# ${e.name}` : `# ${e.keys[0] ?? "Entry"}`;
  return `${head}\n${e.content}`;
}

function section(header: string, body: string): string {
  if (!body || !body.trim()) return "";
  return `${header}\n${body}`;
}
