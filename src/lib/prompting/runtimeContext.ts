import type { WorldState } from "@/types/worldState";
import type { CanonEvent } from "@/data/canonTimeline";

export function renderRuntimeWorldInfo(opts: {
  state: WorldState;
  sceneCast?: string;
  timelineContext?: string;
  identityGuide?: string;
  canonFocus?: CanonEvent;
}): string {
  const { state, sceneCast, timelineContext, identityGuide, canonFocus } = opts;
  const relations = Object.values(state.relations)
    .map((r) => `${r.name}: trust=${r.trust}, affection=${r.affection}${r.note ? `, note=${r.note}` : ""}`)
    .join("\n");

  const chain = state.activeChain
    ? `${state.activeChain.id} step ${state.activeChain.step}/${state.activeChain.totalSteps}${state.activeChain.notes ? `; ${state.activeChain.notes}` : ""}`
    : "无";

  return [
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
    canonFocus ? renderCanonFocusBlock(canonFocus, state.identity) : "",
  ].filter(Boolean).join("\n\n");
}

/**
 * 把强制触发的 canon event 渲染成"本轮必须叙述的焦点"块。
 * 原作时间线硬约束：事件的发生是不可改变的；玩家的反应方式与行为路径仍保持高自由度。
 */
function renderCanonFocusBlock(e: CanonEvent, identity: string): string {
  const visibilityHint = canonVisibilityHintForIdentity(e.visibility, identity);
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
    "  · 每批以一个【交互】收尾——但分量可大可小：",
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

