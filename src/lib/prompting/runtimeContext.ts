import type { WorldState } from "@/types/worldState";
import { canonTimeline, type CanonEvent } from "@/data/canonTimeline";

/**
 * 在用户消息末尾追加的"本批剧情驱动"块——把 canon focus 从 system 注入升级成
 * 用户消息内的强制指令。
 *
 * 起因：playtest 5 暴露了 system 层的 canon focus + 末位硬约束都被 LLM 忽视的问题。
 * LLM 把 chat history 的"入学日同一天"格调外推到所有后续批次，无视日期跳转和 canon focus。
 *
 * 修法：当本批有 canon focus 时，把"今日是 X 月 Y 日，必须演绎事件 Z"作为
 * 用户消息的一部分——用户消息是 LLM 注意力最强、且最不可能被 history 框架覆盖的位置。
 *
 * 注意：这段是 prompt 时构造的临时增强，不会写回 history。caller 把原始 userInput
 * 存入 history 即可。
 */
export function buildCanonFocusDriver(opts: {
  state: WorldState;
  canonFocus: CanonEvent;
}): string {
  const { state, canonFocus: e } = opts;
  return [
    "",
    "──────────────────────────",
    "[本批剧情驱动 · 必须按下述演绎本批 narration · 违反 = 整批输出作废]",
    `游戏内今日：${state.date.iso}（${state.date.display}）`,
    `原作主线焦点：${e.title}（原作日期 ${e.date.iso}）`,
    `事件概要：${e.summary}`,
    e.location ? `事件发生地点：${e.location}` : "",
    `涉及角色：${e.participants.join("、")}`,
    `主线作用：${e.narrativeFunction}`,
    "",
    "【强制指令】",
    "  · 本批 narration 必须以上述事件作为【核心场景】——事件本身必须在 narration 里被【真实演绎出来】，而不是被提及、不是擦边、不是写成【路人偶遇春日聊几句】的同质日常",
    `  · 玩家身份 = ${state.identity}，事件可见度 = ${e.visibility}——按 canon focus 块里的 visibility hint 选择切入角度（如 supernatural 事件路人不能直接看到本质，但事件外围可被感知）`,
    "  · 场景地点应在上述【事件发生地点】或其外围；不要把场景搬到天台 / 食堂 / 旧校舍等无关地点（除非那是事件实际发生地）",
    "  · 即使你看到 chat history 里之前几批是【入学日延续场景】的格调，本批必须主动跳出该格调，按今日 canon 事件演绎",
    "  · 事件标题（eventTitle 字段）必须反映本事件的核心，不可继续写【入学日·xxx】——除非游戏日期真的就在 2002-04-08",
    "  · narration 里的春日发型按【今日春日发型】块严格使用，不可自由发挥",
    "",
    "回应仍按 <event_json> 块输出。",
    "──────────────────────────",
  ].filter(Boolean).join("\n");
}

/**
 * 提取 prompt 末位硬约束——LLM 注意力在 prompt 中段会衰减（"lost in the middle"），
 * playtest 已观察到 worldInfoAfter 里的硬约束块被 LLM 完全忽视。
 * 此函数返回必须在 prompt 最末位重复的硬约束块，由 compiler 拼到 JSON contract 之后，
 * 作为 LLM 生成前看到的最后一段上下文。
 */
export function renderLateHardConstraints(opts: {
  state: WorldState;
  canonFocus?: CanonEvent;
}): string {
  const { state, canonFocus } = opts;
  const blocks = [
    "[末位硬约束 · 你刚刚读完所有上下文，下面这些是本批输出前必须再次确认的红线]",
    "",
    canonFocus ? renderCanonFocusBlock(canonFocus, state.identity, state.activeCanon) : "",
    renderPacingTier(state, canonFocus),
    renderUntriggeredCanonGuard(state, canonFocus),
    renderHaruhiHairstyleToday(state),
    "",
    "[最终自检]",
    "  · 本批 narration 是否符合上面节奏 Tier？（Tier A 必须 days 3-7 跨天蒙太奇 / Tier C 必须演 canon focus 那个事件本身）",
    "  · 本批 narration 是否触碰了【未触发 canon 禁区】里任何一条？",
    "  · 春日发型是否与【今日春日发型】块对应？",
    "  · canon focus 是否真的在 narration 里发生了？（不只是被提及，而是被演绎出来）",
    "若任一项不符，立刻改写——不要用【已经写完了懒得改】的心态出货。",
  ].filter(Boolean);
  return blocks.join("\n\n");
}

export function renderRuntimeWorldInfo(opts: {
  state: WorldState;
  sceneCast?: string;
  timelineContext?: string;
  identityGuide?: string;
  canonFocus?: CanonEvent;
}): string {
  const { state, sceneCast, timelineContext, identityGuide, canonFocus } = opts;
  const activeCanon = state.activeCanon;
  const relations = Object.values(state.relations)
    .map((r) => `${r.name}: trust=${r.trust}, affection=${r.affection}${r.note ? `, note=${r.note}` : ""}`)
    .join("\n");

  const chain = state.activeChain
    ? `${state.activeChain.id} step ${state.activeChain.step}/${state.activeChain.totalSteps}${state.activeChain.notes ? `; ${state.activeChain.notes}` : ""}`
    : "无";

  // 注意排序意图：
  //   ① 节奏 Tier 块和未触发 canon 禁区两条硬约束放在最前面，避免 LLM 在
  //      读到大量背景信息后忽略它们——这是 playtest 已观察到的失败模式。
  //   ② 然后是 runtime state / relations / canon focus / 其他上下文。
  return [
    renderPacingTier(state, canonFocus),
    renderUntriggeredCanonGuard(state, canonFocus),
    renderHaruhiHairstyleToday(state),
    "[Game Runtime State]",
    `日期：${state.date.display} (${state.date.iso})`,
    `身份：${state.identity}`,
    `当前事件链：${chain}`,
    `春日满足度：${state.haruhiSatisfaction}`,
    `世界稳定度：${state.worldStability}`,
    `玩家压力：${state.playerStress}`,
    `线索：${state.clues.length ? state.clues.join("、") : "无"}`,
    `flags：${state.flags.length ? state.flags.join("、") : "无"}`,
    relations ? `[Relations]\n${relations}` : "[Relations]\n无",
    sceneCast ? `[Scene Cast]\n${sceneCast}` : "",
    timelineContext ? `[Timeline Window]\n${timelineContext}` : "",
    identityGuide ? `[Identity Boundary]\n${identityGuide}` : "",
    canonFocus ? renderCanonFocusBlock(canonFocus, state.identity, activeCanon) : "",
  ].filter(Boolean).join("\n\n");
}

/**
 * 未触发 canon 禁区——把所有"还没在游戏里发生过的 main_line 事件"列出来，
 * 强制 LLM 不要在 narration 中预演 / 描绘 / 顺手提及这些未来事件。
 *
 * 起因：playtest 观察到 LLM 在 4 月中旬就让长门加入 SOS 团（canon 是 5-13），
 * 因为 prompt 里没有"哪些事件还不能写"的硬约束。
 *
 * 设计取舍：
 *   - 只列 title + 日期，不列 summary——避免泄露未来剧情让 LLM 借鉴
 *   - 当前 canon focus 不在列表内（focus 块负责告诉 LLM 这个【可以并必须】发生）
 *   - 即使列表很长也全部列出：未来 canon 越多，LLM 越容易"创意性"地预演几个
 */
function renderUntriggeredCanonGuard(
  state: WorldState,
  canonFocus: CanonEvent | undefined,
): string {
  const triggered = new Set(state.triggeredCanonEvents);
  const focusId = canonFocus?.id;
  const untriggered = canonTimeline
    .filter((e) => e.importance === "main_line")
    .filter((e) => !triggered.has(e.id))
    .filter((e) => e.id !== focusId)
    .sort((a, b) => a.date.iso.localeCompare(b.date.iso));

  if (untriggered.length === 0) return "";

  const lines = untriggered.map(
    (e) => `  · ${e.date.iso}（第 ${e.volume} 卷）：${e.title}`,
  );

  return [
    "[硬约束 · 未触发 canon 禁区 · 违反 = 整批输出作废]",
    "以下是按原作时间线尚未到来的主线事件——绝对不可在本批 narration 中【发生 / 预演 / 演绎 / 提前触发其前置条件】：",
    ...lines,
    "",
    "具体禁止行为（任何一条出现都视为整批输出无效）：",
    "  · 让上述事件提前发生（如：4 月中旬出现「SOS 团成立」「长门加入文艺部因春日强占而被卷入 SOS 团」「朝比奈实玖瑠被绑架进部室」「凉宫春日剪短发」）",
    "  · 让上述事件的关键前置条件被提前完成（如：春日尚未在阿虚提示下决心剪短发前出现短发；春日尚未自己想到「建社团」前已经在筹建 SOS 团）",
    "  · 让玩家「提前认识」尚未在 SOS 团登场的角色（如：朝比奈、古泉、长门在他们各自加入前不应作为 SOS 团相关角色与玩家互动；他们作为「文艺部某沉默学姐」「隔壁班转校生」等普通学生身份出现是允许的，但不得点出其后续身份与超自然属性）",
    "  · 即使玩家选项试图诱导（如「主动跑去文艺部」），narration 也只能写到当时该地点的真实状态——文艺部当时只有长门一个普通沉默部员，没有 SOS 团活动",
    "",
    "若不慎写到上述任一禁区，请立刻改写本批 narration——这是不可妥协的硬约束。",
  ].join("\n");
}

/**
 * 当天春日发型——按 canon 严格规律计算注入。
 *
 * 起因：playtest 反复观察到 LLM 把春日描写成「黄色发带女生」（连续多批）。
 * canon 真实规律是入学后每天按星期换发型——【绑发点数 = 星期数 - 1】，
 * 周一 0 个（披散）、周二 1 个、…、周日 6 个。这一规律持续到 2002-05-07
 * 阿虚指出规律 + 春日剪短发为止；之后春日是短发 + 黄色侧发带。
 *
 * 修法：壳子按 state.date.iso 算出今日星期 → 直接给出今日春日发型描述。
 * LLM 不需要也不应自由发挥发型。
 */
function renderHaruhiHairstyleToday(state: WorldState): string {
  // 与 timeAdvance.parseGameDate 同构，保证日期解析在本地时区一致：
  // "YYYY-MM-DD" 补 T08:00 后按本地解析，避免 UTC 边界把日期跨日错位。
  const isoForParse = /T/.test(state.date.iso) ? state.date.iso : `${state.date.iso}T08:00`;
  const d = new Date(isoForParse);
  if (Number.isNaN(d.getTime())) return "";

  const entranceMs = new Date("2002-04-08T08:00").getTime();
  if (d.getTime() < entranceMs) return ""; // 入学前不在游戏关心范围

  // 剪短发后：固定短发 + 黄色侧发带
  // 双判定：① triggered marker 或 ② 日期 >= 5-07（覆盖"haruhi_cuts_hair 这批 canon focus
  // 当时还未标记 triggered，但日期已经过了 5-07"的边界情况——之前的 playtest 暴露过这个 bug）
  const cutoffMs = new Date("2002-05-07T08:00").getTime();
  if (
    state.triggeredCanonEvents.includes("haruhi_cuts_hair") ||
    d.getTime() >= cutoffMs
  ) {
    return [
      "[今日春日发型 · canon 硬约束]",
      "凉宫春日已剪短发（5-07 那天剪的）——固定为【短发 + 两侧黄色发带】，不再每日变化。",
      "narration / dialogue 里写到春日发型时只能这么描述，不得描写长发、马尾、扎发或绑发点。",
    ].join("\n");
  }

  // 入学到剪短发之间：按星期循环
  const day = d.getDay(); // 0=周日 1=周一 ... 6=周六
  const ties = day === 0 ? 6 : day - 1; // canon: 绑发点数 = 星期数 - 1
  const weekdayLabel = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][day];
  const styleDesc = [
    "披散（0 个绑发点 · 长发自然垂下，无任何马尾或束发）",
    "1 个绑发点（在头侧某处束起，类似单马尾）",
    "2 个绑发点（左右各一，类似双马尾或双束）",
    "3 个绑发点",
    "4 个绑发点",
    "5 个绑发点",
    "6 个绑发点（一周里最多的一天）",
  ][ties];

  const dateStr = state.date.iso.split("T")[0];
  return [
    "[今日春日发型 · canon 硬约束 · 不可自由发挥]",
    `今日是 ${dateStr}（${weekdayLabel}）→ 凉宫春日今日发型 = 【${styleDesc}】`,
    "canon 规律：绑发点数 = 星期数 - 1（周一 0 个披散 / 周二 1 个 / …… / 周日 6 个）。",
    "硬约束：",
    "  · 写春日出场时只能用今日对应发型，不得描写【黄色发带】【蝴蝶结】等错误细节",
    "  · 阿虚后来才发现这个规律，故事里【其他角色】不能直接点破规律——narration 写春日发型时按今日实际样子描写即可",
    "  · 春日发色是【深栗 / 棕色】，不是金色或黄色；发带这个时期不存在",
    "  · 若 narration 不慎写错（如周一却写成绑了两个束），整段无效",
  ].join("\n");
}

/**
 * 渲染"canon 间日常预算"提示块——给 LLM 看本批属于哪段 canon 间日常缓冲，
 * 还剩多少天 / 多少批，让 LLM 自由分配节奏（连贯小弧线 vs 大跨度蒙太奇）。
 */
function renderDailyBudgetBlock(state: WorldState): string {
  const b = state.dailyBudget;
  if (!b || b.plannedBatches === 0) return "";

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const cur = new Date(state.date.iso).getTime();
  const next = new Date(b.nextCanonIso).getTime();
  const daysRemaining = Math.max(0, Math.round((next - cur) / ONE_DAY));
  const batchesRemaining = Math.max(0, b.plannedBatches - b.elapsedBatches);
  const ideal = batchesRemaining > 0 ? Math.round(daysRemaining / batchesRemaining) : 0;

  return [
    "",
    "【canon 间日常预算 · 灵活节奏指南】",
    `  · 上 canon → 下个 canon 共规划 ${b.plannedBatches} 批日常缓冲（已用 ${b.elapsedBatches} 批）`,
    `  · 距下个 canon（${b.nextCanonIso}）还剩 ${daysRemaining} 天 / 还剩 ${batchesRemaining} 批日常`,
    `  · 平均每批应跨约 ${ideal} 天——但你不必死板均摊，可以灵活分配：`,
    `    - 【连贯小弧线】：连续 2-3 批写同一时段的事（如某周末玩家做了某事），每批跨 0-2 天，建立连续叙事。然后下批用蒙太奇大跨度补回时间`,
    `    - 【单批跨大段】：某批写跨多天的蒙太奇（如「这周里 / 接下来一周」），一次性推进 5-10 天`,
    `    - 【中速推进】：每批均匀跨 ${ideal} 天左右`,
    `  · 关键：批数和日历跨度的总和最终要自然填满 ${daysRemaining} 天，不要刻意均摊到全部一样`,
    `  · 上一个 canon scope=${b.prevCanonScope}：${b.prevCanonScope === "large" ? "上 canon 是【大事件】，玩家需要时间消化——本段日常不要急着推进，可以多写【后续涟漪】（同学议论 / 玩家心理变化 / 关系微调）" : b.prevCanonScope === "small" ? "上 canon 是【小事件】，本段日常正常节奏即可" : "上 canon 是【中型事件】，本段日常正常节奏"}`,
    "",
  ].join("\n");
}

/**
 * 节奏分级：根据当前是否在主线 / 是否有 canon focus / 玩家身份，决定本批的时间流速。
 * 三档：
 *   Tier C（慢镜头）：有 canon focus 或在事件链中——分钟到几小时，scene 模式，慢慢展开
 *   Tier A（快进）：路人身份 + 无 canon focus + 无事件链——3-7 天/批，summary 模式，跳过日常
 *   Tier B（中速）：fringe+ 身份 + 无 canon focus——1-3 天/批，summary 或 scene
 *
 * 关键设计意图：让玩家在与主线无关的日常时段【真实地推进时间】，而不是在分钟级原地踏步。
 * 当时间跨过 canon 事件日期，eventTrigger 会自动注入 canonFocus，本块自动切回 Tier C 慢镜头。
 */
function renderPacingTier(state: WorldState, canonFocus: CanonEvent | undefined): string {
  // Tier C - 与主线强相关
  if (canonFocus) {
    return [
      "[硬约束 · 节奏 · Tier C 慢镜头 · 主线焦点 · 违反 = 整批输出作废]",
      "本批与原作主线事件强相关，必须慢下来逐场展开：",
      "  · pace = scene",
      "  · timeAdvance：分钟级（{minutes: 5-30}）或最多几小时；**绝不跳天**",
      "  · narrations 段数按 canon focus 块里的 scope 控制（small 1-2 批 / medium 2-3 批 / large 4-6 批）",
      "  · 玩家在场细节、人物表情、对白节奏全部铺开——这是玩家熟悉期待的高潮节点，不要草草带过",
    ].join("\n");
  }
  if (state.activeChain) {
    return [
      "[硬约束 · 节奏 · Tier C 慢镜头 · 事件链中 · 违反 = 整批输出作废]",
      `当前在事件链「${state.activeChain.id}」第 ${state.activeChain.step}/${state.activeChain.totalSteps} 节——保持慢镜头：`,
      "  · pace = scene",
      "  · timeAdvance：分钟到小时级，绝不跳天",
      "  · narrations 紧贴事件链节奏",
    ].join("\n");
  }
  // Tier A - 路人 + 无主线
  if (state.identity === "passerby") {
    const budgetBlock = renderDailyBudgetBlock(state);
    return [
      "[硬约束 · 节奏 · Tier A 快进 · 路人日常 · 违反 = 整批输出作废]",
      budgetBlock,
      "玩家是【路人身份】且无主线焦点——本批是 canon 间日常缓冲，按上方【canon 间日常预算】块的指引推进时间。",
      "",
      "【时间推进 · 按预算块灵活】",
      "  · pace = summary（推荐）或 scene（仅当本批是【连贯小弧线】中的一批时可用）",
      "  · timeAdvance 的 days 数值参考预算块的「平均每批应跨约 X 天」——但允许灵活：连贯弧线给小 days，大跨蒙太奇给大 days，整体填满 canon 间隔",
      "  · 不允许 days = 0（除非剧情明确是连续场景的下一拍，但那种情况应连用 hours）；尽量给【整数 days】或【hours = 0 days >= 1】",
      "  · 注意：壳子代码会对 timeAdvance 按预算均摊式 clamp——若你给得太小会被强制提到 floor(ideal * 0.7) days。配合而非对抗这个 clamp",
      "",
      "【上一批是 canon 焦点（scene 模式）时 · 关键】",
      "  · 即使你看到对话历史里上一批是慢镜头 canon 场景（如入学日宣言），本批是【非 canon 的下一批】，必须立刻跳过当天剩余 + 接下来 3-7 天",
      "  · 不要把上一批 canon 场景的午休 / 社团参观 / 放学 / 回家路上当作【还没写完的延续】——这些日常在原作里就是几句话甚至一句话带过的",
      "  · 原作里入学日宣言之后，下一段就直接跳到【几天后阿虚发现春日每天换发型】——并没有展开当天午休吃了什么、下午社团摊位转了哪些、放学如何回家。本批必须照此模式：用 1-2 段总结当天剩下时间，然后直接跳几天",
      "  · ✓ 正确开场示范：「宣言事件之后的几天里，五班教室一直处在一种诡异的低气压中。我每天通学、上课、回家，远远听见走廊上【那个凉宫】的传闻一天比一天离奇。」",
      "  · ✗ 错误开场示范：「我收回视线，把笔搁在课本边缘」（这是分钟级延续，绝对禁止）",
      "",
      "【narration 写法 · 跨天蒙太奇】",
      "  · narrations 8-14 段，每段是一个【跨天/跨周的小蒙太奇】，不是分钟级的连续动作",
      "  · **第一段必须以时间转场词开头**——明确告知玩家【距上一批已过去多少天】。不允许直接接续上一批末尾的动作",
      "    · ✓ 第一段示范：「上次电研社事件之后的几天里，我每天通学、上课、回家——五班那边的传闻一天比一天离奇。」",
      "    · ✓ 第一段示范：「过了大约一周，期中考前的紧张气氛盖过了 SOS 团的话题。」",
      "    · ✗ 第一段错误：「我走出文艺部门口」（这是分钟级延续上一批的动作，绝对禁止）",
      "  · 段首时间转场词：「这周里」「接下来三四天」「周三放学」「周末下午」「下周一早自习」「过了几天」「这阵子」「期中考前」「连续好几天」",
      "  · ✗ 错误示范：「我走进教室坐下」「我打开课本」「我抬头看了一眼春日」——这是分钟级动作，不允许",
      "  · ✓ 正确示范：「这周里春日依旧每天换发型，全班依旧没人敢搭话」「过了几天，春日开始下课就溜出教室不见人影」「周末我在家发呆，听说她去了文艺部」",
      "  · 内容范围：晨间通学 / 午休吃饭 / 放学路上 / 家中独处 / 周末打发时间——可远远瞥到 SOS 团或听到八卦但不参与",
      "  · 上一批 canon 的【影响】要在本批日常里有真实回响——例如上批演了 SOS 团成立，本批日常里同学议论【听说一年五班那个怪人组了个奇怪社团】——日常剧情对 canon 事件的 ripple effect",
      "",
      "【批末选项 · 必须是跨天决定】",
      "  · choices 必须是【未来几天 / 一周内的方向性选择】，不可写【马上下一秒做什么】",
      "  · ✗ 错误：「现在就转身和谷口说话 / 立刻起身去倒水 / 抬头看春日」",
      "  · ✓ 正确：「这周末是去逛街 还是 在家追番 / 还是 跟谷口去打游戏」「下周要不要主动加入文艺部 / 还是 继续观望 / 还是 去看看其他社团」「这阵子要不要试着搭话春日 / 还是 维持完全旁观」",
      "",
      "【为什么这么严】",
      "  · 路人身份没有主线接触点，每批不跳天玩家就要花几十批才能走到下个 canon 事件，游戏体验崩塌",
      "  · 这是已被 playtest 多次验证的失败模式：20 批只走了 6.5 天 / 4 批 daily 全部停在同一天 4-08——属于整批无效",
    ].join("\n");
  }
  // Tier B - fringe+ 无主线
  const budgetBlockB = renderDailyBudgetBlock(state);
  return [
    `[硬约束 · 节奏 · Tier B 中速 · 团边缘日常 · 违反 = 整批输出作废]`,
    budgetBlockB,
    `玩家身份是 ${state.identity}（已与 SOS 团有不同程度接触），无主线焦点——按上方【canon 间日常预算】块的指引推进时间：`,
    "  · pace = summary（推荐）或 scene（仅当本批是【连贯小弧线】中的一批时可用）",
    "  · timeAdvance 的 days 数值参考预算块的「平均每批应跨约 X 天」——允许灵活，整体填满 canon 间隔即可",
    "  · narrations 8-14 段，段首带跨天转场词",
    "  · 内容：部室日常 / 与团员闲谈 / 春日临时安排 / 放学路顺道",
    "  · 批末选项是【接下来几天的方向性选择】，不是分钟级动作",
  ].join("\n");
}

/**
 * 把强制触发的 canon event 渲染成"本轮必须叙述的焦点"块。
 * 原作时间线硬约束：事件的发生是不可改变的；玩家的反应方式与行为路径仍保持高自由度。
 */
function renderCanonFocusBlock(
  e: CanonEvent,
  identity: string,
  activeCanon?: import("@/types/worldState").ActiveCanonState | null,
): string {
  const visibilityHint = canonVisibilityHintForIdentity(e.visibility, identity);
  const progressBlock = activeCanon ? renderCanonPhaseGuide(activeCanon) : "";
  return [
    "[Canon Focus · 本轮必须叙述的原作主线事件]",
    `事件：${e.title}（${e.date.iso}）`,
    `卷次：第 ${e.volume} 卷`,
    e.location ? `地点：${e.location}` : "",
    `涉及角色：${e.participants.join("、")}`,
    `事件概要：${e.summary}`,
    `主线作用：${e.narrativeFunction}`,
    "",
    progressBlock,
    "",
    "【硬约束 · 事件本体不可改变】",
    "  · 这一事件在原作中就发生于今天此刻，不容跳过、不容错位、不容篡改其客观结果",
    "  · 不得让玩家「凑巧」缺席——事件必须在 narration 里发生",
    "  · 关键事实（谁说了什么宣言、谁加入了团、谁救了谁、世界是否被改写等）必须保持原作走向",
    "",
    "【自由度 · 玩家如何参与高度可变】",
    "  · canon = 事件的客观发生 + 关键结果；自由度 = 玩家如何进入场景、如何反应、看到多少、之后做什么",
    "  · 玩家可以从无数角度切入：身处现场 / 路过隔壁班 / 听到走廊回响 / 事后从八卦里得知 / 间接被卷入余波——按身份与情境自然安排",
    "  · 玩家的反应方式高度自由：旁观 / 凑近 / 主动搭话 / 装作没看见 / 立刻离开 / 找朋友议论 / 私下调查 / 当夜回家失眠……都是合法选择",
    "  · 副线行为不影响 canon 走向但有真实后果：被春日点名 vs 维持局外人姿态会决定玩家的人际网与未来 identity 升级路径",
    "",
    `【慢镜头展开 · 按本事件 scope=${e.scope} 调整批次密度】`,
    `  · 本事件标记为 ${scopeLabel(e.scope)}——${scopeBudget(e.scope)}`,
    "  · 每批 narrations 4-8 段（比日常 12-18 段更短）；大事件慢慢展开，小事件蒙太奇带过，不要硬撑",
    "  · 例：入学日宣言可拆成多个短批——",
    "    批 ①（进教室坐下，看到座位表）→ 选项：先和邻座搭话 / 翻包整理课本 / 远远观察周围",
    "    批 ②（春日走进教室，全班看着她）→ 选项：跟着看她 / 假装不在意 / 和谷口低声议论",
    "    批 ③（春日做出宣言）→ 选项：盯着她看 / 装作没听见 / 快速记下她说的话 / 扫一眼老师反应",
    "    批 ④（宣言后教室死寂）→ 选项：起身倒水缓解尴尬 / 装作翻书 / 转身和后排谁对视",
    "    批 ⑤（老师装作无事继续课程）→ 选项：举手提问 / 认真听课 / 偷偷看春日的反应",
    "  · 每批是否要以【交互】收尾，由【上方进度块的 phase】决定（intro/developing 可选 · climax/resolution 必须）——不要为了凑选项强行结束 intro/developing 批",
    "  · 当本批确实给出 choices 时，分量可大可小：",
    "    - 大部分是【轻交互】：如何反应 / 看哪里 / 说什么 / 是否点头 / 要不要起身——影响人际细节但不改变 canon",
    "    - 关键节点是【真分支】：是否主动接近春日 / 是否相信春日 / 是否插手保护朝比奈——决定后续 identity 与人际起点",
    `  · 本 ${scopeLabel(e.scope)} 事件参考比例：${scopeRatio(e.scope)}（轻交互占多数，真分支只在关键转折出现）`,
    "",
    "【批末选项必须有真实差异】",
    "  · choices 不要写「围观 / 沉默 / 等等看」这种装饰性空选项",
    "  · 要写出有具体行为指向的反应——即使是【轻交互】，每个选项也对应不同的下一批开场（不同的 NPC 互动 / 不同的细节注意到 / 不同的氛围）",
    "  · 例：入学日批 ②（春日入场）的合法【轻交互】选项：",
    "      - 「跟着全班一起看春日走过」（→ 下一批春日会扫到玩家一眼）",
    "      - 「保持低头看自己的笔记」（→ 下一批维持局外人视角，听到的是周围议论声）",
    "      - 「侧过身和谷口对视一眼」（→ 下一批和谷口私下议论，建立八卦伙伴）",
    "      - 「装作系鞋带继续偷听」（→ 下一批捕捉到春日和谷口的对话碎片）",
    "  · 这四个选项都不会改 canon（春日依然要做宣言），但每个会让下一批走向真正不同的细节、对话伙伴、氛围",
    "",
    `【可见度提示（玩家身份=${identity}）】`,
    visibilityHint,
  ].filter(Boolean).join("\n");
}

/**
 * 跨多批演绎一个 canon 时，告诉 LLM 当前是【第几批 / 共几批】 + 【narrative phase】，
 * 让 LLM 把本批控制在该 phase 的剧情份额里——不要一批就把整个事件演完。
 */
function renderCanonPhaseGuide(
  ac: import("@/types/worldState").ActiveCanonState,
): string {
  const phaseLabel = {
    intro: "开端 · 铺垫氛围",
    developing: "发展 · 主体推进",
    climax: "高潮 · 关键转折",
    resolution: "收尾 · 余波暗示",
  }[ac.narrativePhase];

  const phaseGuide = {
    intro: [
      "  · 本批是事件的【开端】——铺垫氛围、把玩家带到事件现场或视野内",
      "  · 关键情节点【绝不能在本批高潮性出现】——最多让玩家感觉【有什么事正在发生】",
      "  · 重点写【环境 / 走向 / 不安】，不要急于让 canon 关键事实落地",
      "  · 例：入学日宣言 = 本批写【班主任进来开始介绍 / 隔壁五班传来骚动声 / 主角抬头注意到走廊】，宣言本身留到下一批",
    ],
    developing: [
      "  · 本批是事件的【发展】——主体推进，关键 NPC 上场，对白展开",
      "  · 戏剧张力上升但还没到顶——玩家开始接收信息但还没看到结局",
      "  · 例：入学日宣言 = 本批写【凉宫出场 / 站起来开口 / 教室空气凝固】，但具体那一句宣言还没说出来或刚说一半",
    ],
    climax: [
      "  · 本批是事件的【高潮】——canon 关键事实在此发生：那一句台词、那一刻决定、那一次转折",
      "  · 这是玩家熟悉期待的【原作那一刻】——慢镜头展开，所有细节都要充分写出",
      "  · 例：入学日宣言 = 本批写【凉宫说完那段「外星人未来人异世界人超能力者」宣言 / 教室死寂 / 阿虚回头与她对视】",
    ],
    resolution: [
      "  · 本批是事件的【收尾】——余波、人物表情、暗示后续",
      "  · canon 关键已经发生过了，本批写【散场 / 议论 / 玩家走出场景 / 暗示下一步】",
      "  · 不要再把 canon 关键事实重演一遍——那是上一批做过的事",
    ],
  }[ac.narrativePhase];

  // 【批末是否要交互】按 phase 决定：
  //   intro/developing：可选——若剧情自然延续到下批就 requiresChoice=false（让事件流动）
  //   climax/resolution：必须——这是玩家做关键决定的位置
  const choiceGuide =
    ac.narrativePhase === "intro" || ac.narrativePhase === "developing"
      ? [
          "【交互 · 本批可选】",
          "  · 本批是 intro/developing 阶段——是否在末尾给玩家选择由你判断：",
          "  · 若剧情自然推进、本批末尾停在【还在展开中的张力点】（玩家不需要做决定，只是【看下去】）→ requiresChoice = false（choices 留空数组），下批从你写的张力点继续",
          "  · 若本批末尾恰好遇到【玩家可以做出反应的小节点】（如NPC问玩家话 / 走到岔路口）→ requiresChoice = true，给 2-4 个【符合本 phase 张力】的选项",
          "  · 不要为了凑选项强行结束本批——canon 多批演绎的核心就是允许某批纯演绎、不强制选择",
        ]
      : [
          "【交互 · 本批必须】",
          "  · 本批是 climax/resolution 阶段——必须给玩家选择（requiresChoice = true）",
          ac.narrativePhase === "climax"
            ? "  · climax 选项是【玩家在原作关键节点的反应方式】：旁观 / 凑近 / 主动卷入 / 立刻离开 / 找朋友议论——决定后续人际起点与 identity 升级路径"
            : "  · resolution 选项是【接下来几天 / 下一阶段的方向】——本 canon 已演完，玩家选择下一步走向",
        ];

  return [
    `【跨批演绎进度 · 本 canon 第 ${ac.batchesProgress} / ${ac.totalBatchesPlanned} 批】`,
    `当前 phase = ${phaseLabel}`,
    `这意味着：`,
    ...phaseGuide,
    "",
    `【硬约束】本批 narration 必须严格控制在【${phaseLabel}】的剧情份额内——`,
    ac.batchesProgress < ac.totalBatchesPlanned
      ? `  · 不要在本批就把 canon 整个事件演完！剩下的留给后续 ${ac.totalBatchesPlanned - ac.batchesProgress} 批`
      : `  · 本批是 canon 的最后一批，可以收尾 / 让玩家走出场景 / 暗示下一步`,
    `  · 如果本批是 intro/developing，结尾要留一个【未解的张力点】让玩家想看下一批——而不是把所有事都讲完`,
    "",
    ...choiceGuide,
  ].join("\n");
}

function scopeLabel(scope: CanonEvent["scope"]): string {
  return { small: "小型事件", medium: "中型事件", large: "大型事件" }[scope];
}

function scopeBudget(scope: CanonEvent["scope"]): string {
  return {
    small: "推荐 1-2 批 / 1-2 次互动（蒙太奇式带过即可，不要硬撑）",
    medium: "推荐 2-3 批 / 2-4 次互动（标准展开节奏）",
    large: "推荐 4-6 批 / 4-8 次互动（玩家熟悉期待的高潮节点，应充分展开 · 慢镜头 · 多视角）",
  }[scope];
}

function scopeRatio(scope: CanonEvent["scope"]): string {
  return {
    small: "1-2 次互动，1 个轻交互 + 0-1 个真分支",
    medium: "2-4 次互动，1-3 个轻交互 + 1 个真分支",
    large: "4-8 次互动，3-6 个轻交互 + 1-2 个真分支",
  }[scope];
}

function canonVisibilityHintForIdentity(
  visibility: CanonEvent["visibility"],
  identity: string,
): string {
  if (visibility === "public") {
    return "公开层事件——任何身份的玩家都能直接看到、听到或卷入。按 POV 角色身份与位置自然描写。";
  }
  if (visibility === "sos_internal") {
    if (["fringe", "core", "anomaly", "observer"].includes(identity)) {
      return "SOS 团内部事件——玩家身份允许近距离观察或参与，可详细描写团内互动。";
    }
    return "SOS 团内部事件——玩家是路人学生，无法直接参与。请通过「远远看到」「走廊偶遇」「听到只言片语」等间接方式让玩家感知此事正在发生。";
  }
  // supernatural
  if (["anomaly", "observer"].includes(identity)) {
    return "超自然事件——玩家身份能识别其本质（思念体 / 闭锁空间 / 时间平面等），可使用原作术语描写全貌。";
  }
  if (identity === "core") {
    return "超自然事件——玩家身份是 SOS 团核心，可能从古泉/长门处听到事件存在但不一定理解全貌。narration 用「奇怪 / 不对劲」等描述词，避免直接命名「闭锁空间 / 思念体」等术语。";
  }
  return "超自然事件——玩家是路人或边缘人物，绝对无法直接看到事件超自然本质。请用「那天好像有什么不对劲」「传出一些奇怪的传闻」「事后才隐约听说有什么古怪」等让玩家间接感知；不得使用「闭锁空间 / 思念体 / 神人」等原作术语。";
}

