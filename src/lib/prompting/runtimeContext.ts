import type { WorldState } from "@/types/worldState";

export function renderRuntimeWorldInfo(opts: {
  state: WorldState;
  sceneCast?: string;
  timelineContext?: string;
  identityGuide?: string;
}): string {
  const { state, sceneCast, timelineContext, identityGuide } = opts;
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
  ].filter(Boolean).join("\n\n");
}

