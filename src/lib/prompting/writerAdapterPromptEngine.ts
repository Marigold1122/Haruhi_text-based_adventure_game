import { pickPreset, renderAuthorsNote, selectLoreEntries } from "@/lib/promptRouter";
import type { CharacterCardV2 } from "@/types/character";
import type { Lorebook, LoreEntry } from "@/types/lorebook";
import type { EventPresetKind, SamplingParams } from "@/types/preset";
import type { ChatMessage } from "@/types/turn";
import type { WorldState } from "@/types/worldState";
import type { PromptBuildTrace } from "./types";
import { renderNaturalChatHistory, renderStoryTurnAsNaturalText } from "./naturalHistory";
import { REFERENCE_STYLE_PROMPT } from "./referenceStyleProfile";
import { buildContentAssetIndex } from "@/lib/rag/contentAssetIndex";
import { formatRagEntry, selectRagEntries } from "@/lib/rag/ragSelector";
import type { PlotDecision } from "@/types/storylet";
import type { BlandnessReport } from "@/lib/plot/blandness";

export type WriterAdapterPromptBuildInput = {
  card: CharacterCardV2;
  lorebook: Lorebook;
  state: WorldState;
  eventKind: EventPresetKind;
  history: ChatMessage[];
  summary?: string | null;
  userInput: string;
  sceneCast?: string;
  timelineContext?: string;
  identityGuide?: string;
  canonFocus?: import("@/data/canonTimeline").CanonEvent;
  plotDecision?: PlotDecision;
  blandness?: BlandnessReport;
};

export type WriterAdapterPromptBuildOutput = {
  messages: ChatMessage[];
  sampling: SamplingParams;
  trace: PromptBuildTrace;
};

export type AdapterPromptInput = {
  prose: string;
  state: WorldState;
  userInput: string;
  characterName: string;
  sampling?: SamplingParams;
};

export type MetadataPromptInput = {
  state: WorldState;
  userInput: string;
  characterName: string;
  sampling?: SamplingParams;
};

export type AdapterPromptOutput = {
  messages: ChatMessage[];
  sampling: SamplingParams;
};

export function buildWriterAdapterPrompt(
  input: WriterAdapterPromptBuildInput,
): WriterAdapterPromptBuildOutput {
  const preset = pickPreset({ eventKind: input.eventKind, state: input.state });
  const cardData = input.card.data;
  const scanText = [
    ...input.history.slice(-6).map(messageTextForScan),
    input.userInput,
  ].join("\n");
  const lore = selectLoreEntries({ lorebook: input.lorebook, state: input.state, scanText });
  const assetIndex = buildContentAssetIndex({ includeNpcCards: true });
  const sceneCastRag = selectRagEntries({
    entries: assetIndex.entries,
    state: input.state,
    scanText,
    sceneCast: input.sceneCast,
    forceEntityIds: input.plotDecision?.ragHints.forceEntityIds,
    forceEntryIds: input.plotDecision?.ragHints.forceEntryIds,
    includeKinds: ["character_profile", "character_voice"],
    maxEntries: 6,
    maxEntriesPerEntity: 2,
  });
  const authorsNote = renderAuthorsNote({
    preset,
    state: input.state,
    sceneCast: input.sceneCast,
    timelineContext: input.timelineContext,
    identityGuide: input.identityGuide,
    canonFocus: input.canonFocus,
  });

  const historyText = renderNaturalChatHistory({
    history: input.history,
    currentUserInput: "",
    userName: "读者",
    assistantName: cardData.name,
  });

  const system = [
    "你是互动轻小说的正文写作模型。本轮输出只包含自然正文段落，省略标题、JSON、Markdown、字段名、选项列表和解释。",
    "后续规则适配器会把正文切成前端点击单元；这里保持正文连续，使用自然段和自然对白即可。",
    "写作方向：先推进现场，再给短判断。每个小段承接一个可感知细节、动作、对白或角色反应。",
    "心理写法：让情绪通过脚步、视线、手上动作、声音变化和物件细节显出来。抽象判断最多一句，随后回到场景。",
    "篇幅建议：约 450-750 个中文字符；紧迫场景更短，日常铺陈可以略放松。结尾停在读者需要回应、移动或继续观察的瞬间。",
    "台词正文只保留角色说出口的话；语气由前后动作、简短对白标签和上下文承载，结构层会再抽取 TTS 信息。",
    "读者行动模糊时，用角色反应和场景压力引导下一步。",
    REFERENCE_STYLE_PROMPT,
  ].join("\n");

  const user = [
    section("角色资料", [
      `角色名：${cardData.name}`,
      cardData.description,
      cardData.personality,
      cardData.scenario,
    ].filter(Boolean).join("\n\n")),
    lore.length > 0 || sceneCastRag.selected.length > 0
      ? section("相关资料", [
        ...lore.map(formatLoreEntry),
        ...sceneCastRag.selected.map((item) => formatRagEntry(item.entry)),
      ].join("\n\n"))
      : "",
    input.summary ? section("滚动摘要", input.summary) : "",
    section("运行状态", [
      `当前日期：${input.state.date.display}`,
      `当前身份：${input.state.identity}`,
      `当前节奏：${input.state.flow}`,
      input.sceneCast ? `本轮场景成员：${input.sceneCast}` : "",
      input.timelineContext ?? "",
      input.identityGuide ?? "",
      authorsNote,
    ].filter(Boolean).join("\n\n")),
    input.plotDecision ? section("本轮剧情调度", renderPlotDecision(input.plotDecision, input.blandness)) : "",
    historyText ? section("互动历史", historyText) : "",
    section("最新互动", input.userInput),
    "请从最新互动自然续写正文。只写正文。",
  ].filter(Boolean).join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const sampling = normalizeWriterSampling(preset.sampling);

  return {
    messages,
    sampling,
    trace: {
      mode: "writer-adapter",
      presetName: `writer-adapter:${preset.name}`,
      activeLoreEntries: [
        ...lore.map((entry) => entry.name ?? entry.keys[0] ?? "(unnamed)"),
        ...sceneCastRag.selected.map((item) => item.entry.title),
      ],
      forcedRagEntries: sceneCastRag.selected
        .filter((item) => item.reasons.includes("forced_entity") || item.reasons.includes("forced_entry"))
        .map((item) => item.entry.title),
      ragStats: {
        totalCandidates: assetIndex.stats.totalEntries,
        selectedCount: sceneCastRag.selected.length,
        droppedByGate: sceneCastRag.droppedByGate.slice(0, 12),
        droppedByBudget: sceneCastRag.droppedByBudget.slice(0, 12),
        forcedEntityIds: sceneCastRag.forcedEntityIds,
      },
      plotDecision: input.plotDecision ? {
        eventKind: input.plotDecision.eventKind,
        storyletId: input.plotDecision.activeStorylet?.id,
        canonEventId: input.plotDecision.canonFocus?.id,
        reason: input.plotDecision.reason,
        intensityTarget: input.plotDecision.intensityTarget,
      } : undefined,
      blandness: input.blandness,
      authorsNote,
      outputMode: "natural",
      adapterMode: "rule",
      messageCount: messages.length,
      sampling,
      styleProfile: "haruhi-reference-v1",
    },
  };
}

export function buildStoryMetadataPrompt(input: MetadataPromptInput): AdapterPromptOutput {
  const system = [
    "你是互动叙事的元数据助手，可以和正文写作模型并行工作。",
    "职责限于元数据：根据当前状态和最新互动生成标题、状态变化、时间推进和下一步选择。",
    "只输出一个 <event_json>...</event_json> 块，块内是合法 JSON。",
    "choices 使用 2-4 个具体、可执行、短的行动，避开空泛等待项。",
    "状态变化无法判断时用空对象；字段只记录已有事实。",
  ].join("\n");

  const user = [
    "请输出这个结构：",
    "<event_json>",
    "{",
    '  "eventTitle": "短标题",',
    '  "narration": "",',
    '  "scene": "场景",',
    '  "time": "时间",',
    '  "mood": "整体气氛",',
    '  "stateChanges": {},',
    '  "pace": "scene",',
    '  "timeAdvance": {"minutes": 10},',
    '  "requiresChoice": true,',
    '  "choices": ["行动一", "行动二", "行动三"]',
    "}",
    "</event_json>",
    "",
    section("当前状态", [
      `日期：${input.state.date.display}`,
      `身份：${input.state.identity}`,
      `节奏：${input.state.flow}`,
      `当前角色：${input.characterName}`,
      `最新互动：${input.userInput}`,
    ].join("\n")),
  ].join("\n");

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    sampling: normalizeMetadataSampling(input.sampling),
  };
}

export function buildStoryTurnAdapterPrompt(input: AdapterPromptInput): AdapterPromptOutput {
  const system = [
    "你是结构适配器。",
    "任务：把给定轻小说正文切成前端可点击的 event_json。只输出一个 <event_json>...</event_json> 块。",
    "保持原文内容和顺序，只清理明显标签和多余空白。",
    "beats 是点击单元：每个 beat 是有上下承接的小段，通常包含 1-4 个 blocks，约 120-280 个中文字符。",
    "blocks.type 只能是 narration 或 dialogue。dialogue.text 只放台词内容，不放角色名、引号或语气说明；语气放 mood/tts。",
    "最后必须 requiresChoice=true，并给 2-4 个具体、可执行、短的行动 choices。",
    "状态变化无法判断时用空对象；字段只记录已有事实。",
  ].join("\n");

  const user = [
    "请把下面正文转换为这个 JSON 结构：",
    "<event_json>",
    "{",
    '  "eventTitle": "短标题",',
    '  "scene": "场景",',
    '  "time": "时间",',
    '  "mood": "整体气氛",',
    '  "beats": [',
    '    {"blocks": [',
    '      {"type": "narration", "text": "旁白正文"},',
    '      {"type": "dialogue", "speaker": "角色名", "text": "台词内容", "mood": "语气", "tts": {"tone": "语气", "emotion": "情绪", "delivery": "说法", "intensity": 0.5}}',
    "    ]}",
    "  ],",
    '  "stateChanges": {},',
    '  "pace": "scene",',
    '  "timeAdvance": {"minutes": 10},',
    '  "requiresChoice": true,',
    '  "choices": ["行动一", "行动二", "行动三"]',
    "}",
    "</event_json>",
    "",
    section("当前状态参考", [
      `日期：${input.state.date.display}`,
      `身份：${input.state.identity}`,
      `节奏：${input.state.flow}`,
      `当前角色：${input.characterName}`,
      `最新互动：${input.userInput}`,
    ].join("\n")),
    section("需要适配的正文", input.prose),
  ].join("\n");

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    sampling: normalizeAdapterSampling(input.sampling),
  };
}

function normalizeWriterSampling(sampling: SamplingParams): SamplingParams {
  return {
    ...sampling,
    temperature: Math.max(sampling.temperature ?? 1.15, 1.15),
    top_p: sampling.top_p ?? 0.95,
    max_tokens: Math.min(Math.max(sampling.max_tokens ?? 1800, 1200), 2200),
  };
}

function normalizeMetadataSampling(sampling?: SamplingParams): SamplingParams {
  return {
    temperature: 0.2,
    top_p: 0.85,
    max_tokens: Math.min(Math.max(sampling?.max_tokens ?? 700, 450), 900),
  };
}

function normalizeAdapterSampling(sampling?: SamplingParams): SamplingParams {
  return {
    temperature: 0.15,
    top_p: 0.8,
    max_tokens: Math.max(2200, Math.min(sampling?.max_tokens ?? 3600, 4200)),
  };
}

function messageTextForScan(message: ChatMessage): string {
  return message.parsed ? renderStoryTurnAsNaturalText(message.parsed) : message.content;
}

function formatLoreEntry(entry: LoreEntry): string {
  const head = entry.name ? `# ${entry.name}` : `# ${entry.keys[0] ?? "Entry"}`;
  return `${head}\n${entry.content}`;
}

function renderPlotDecision(plot: PlotDecision, blandness?: BlandnessReport): string {
  const lines = [
    `本轮力度约 ${plot.intensityTarget}/100，写成现场推进，不写成大纲。`,
    plot.activeStorylet ? `取景起点：${plot.activeStorylet.hook}` : "",
    plot.activeStorylet ? `现场阻力：${plot.activeStorylet.conflict}` : "",
    plot.canonFocus ? `原作锚点：${plot.canonFocus.title}。${plot.canonFocus.summary}` : "",
    plot.fixedFacts.length > 0 ? `必须守住：${plot.fixedFacts.join("；")}` : "",
    plot.variableOutcomes.length > 0 ? `可以变化：${plot.variableOutcomes.join("；")}` : "",
    blandness ? `节奏提醒：${blandness.score >= 61 ? "需要一个有后果的小动作或短对白" : "保持承接，不要只平移观察"}。` : "",
    "如果最新互动或历史表述与“必须守住”冲突，以“必须守住”为准，把冲突前提改写成误听、流言、错觉或旁观角度。",
    "不要在正文里出现“剧情钩子、固定事实、可变结果、强度目标、平淡度、确定目标、任务清单”等调度词。",
    "不要把表情、眼神、内心模拟写成带引号的台词；只有真正说出口的话才用引号。",
  ];
  return lines.filter(Boolean).join("\n");
}

function section(title: string, body: string): string {
  const trimmed = body.trim();
  return trimmed ? `<${title}>\n${trimmed}\n</${title}>` : "";
}
