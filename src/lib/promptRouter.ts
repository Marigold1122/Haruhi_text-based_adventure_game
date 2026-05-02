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

export type BeatContext = {
  arc: string;
  currentIndex: number;
  total: number;
  current: {
    title: string;
    summary: string;
    pace: "summary" | "scene";
    requiresChoice: boolean;
    choiceHint?: string;
    expectedSpan?: string;
  };
  next?: {
    title: string;
    summary: string;
  };
};

export function renderAuthorsNote(opts: {
  preset: Preset;
  state: WorldState;
  sceneCast?: string;
  beat?: BeatContext;
}): string {
  const { preset, state, sceneCast, beat } = opts;

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
  const beatBlock = renderBeatBlock(beat);

  return preset.authors_note_template
    .replace(/\{\{date\}\}/g, state.date.display)
    .replace(/\{\{flow\}\}/g, flowLabel(state.flow))
    .replace(/\{\{identity\}\}/g, identityLabel(state.identity))
    .replace(/\{\{world_state\}\}/g, worldStateBlock)
    .replace(/\{\{chain\}\}/g, chainBlock)
    .replace(/\{\{scene_cast\}\}/g, sceneCastBlock)
    .replace(/\{\{beat\}\}/g, beatBlock);
}

function renderBeatBlock(beat?: BeatContext): string {
  if (!beat) return "（未配置 outline——LLM 自由发挥日常）";
  const lines: string[] = [];
  lines.push(`【主线方向】${beat.arc}`);
  lines.push("");
  lines.push(`【当前节拍 ${beat.currentIndex + 1}/${beat.total}：${beat.current.title}】`);
  lines.push(`节奏：${beat.current.pace === "summary" ? "summary（概括跨多日）" : "scene（实时场景）"}`);
  if (beat.current.expectedSpan) lines.push(`预计跨度：${beat.current.expectedSpan}`);
  lines.push(`需要玩家选择：${beat.current.requiresChoice ? "是（本节拍最后一轮 requiresChoice=true，给 2-4 个选项）" : "否（本节拍全部 requiresChoice=false，玩家无介入权限）"}`);
  if (beat.current.requiresChoice && beat.current.choiceHint) {
    lines.push(`选项围绕：${beat.current.choiceHint}`);
  }
  lines.push("");
  lines.push(`【本节拍要演的内容】`);
  lines.push(beat.current.summary);
  if (beat.next) {
    lines.push("");
    lines.push(`【下一节拍预告（仅参考，不要在本轮越界进入）】`);
    lines.push(`${beat.next.title} —— ${beat.next.summary.split("\n")[0]}`);
  }
  lines.push("");
  lines.push("【节拍推进规则】");
  lines.push("- 本节拍可能需要 1~多 轮叙述完成（特别是 scene）。");
  lines.push("- 当本轮叙述把当前节拍演完时，输出 beatComplete=true，下一轮自动进入下一节拍。");
  lines.push("- 当前节拍未完成时输出 beatComplete=false，下一轮继续推进当前节拍。");
  lines.push("- 不要跳节拍——必须按顺序进入下一个。");
  return lines.join("\n");
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
  beat?: BeatContext;            // 当前剧情大纲节拍（最高优先级注入）
}): AssembledPrompt {
  const { card, lorebook, preset, state, history, summary, userInput, sceneCast, beat } = opts;
  const cardData = card.data;

  // 取最近 N 轮文本作为关键词扫描素材（含本轮输入）
  const scanText = [
    ...history.slice(-6).map((m) => m.content),
    userInput,
  ].join("\n");

  const lore = selectLoreEntries({ lorebook, state, scanText });
  const loreBefore = lore.filter((e) => e.position !== "after_char");
  const loreAfter = lore.filter((e) => e.position === "after_char" || e.position === undefined);

  const authorsNote = renderAuthorsNote({ preset, state, sceneCast, beat });

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
