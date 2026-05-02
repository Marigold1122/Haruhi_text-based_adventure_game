import type { WorldState } from "@/types/worldState";
import type { SummaryState } from "@/lib/summary";
import type { PromptBuildTrace } from "@/lib/prompting/types";
import { identityGuides } from "@/data/identityGuide";

type Props = {
  state: WorldState;
  characterName: string;
  trace?: PromptBuildTrace | null;
  summaryStatus?: SummaryState | null;
  queueLength?: number;
  prefetching?: boolean;
};

export function StatusPanel({ state, characterName, trace, summaryStatus, queueLength, prefetching }: Props) {
  return (
    <aside className="status-panel">
      <section>
        <h4>{trace?.mode === "sillytavern-preset-natural" ? "当前主角" : "第一人称 POV"}</h4>
        <p className="big">{characterName}</p>
        <p className="muted">
          {trace?.mode === "sillytavern-preset-natural"
            ? `ST natural 模式尊重 preset 视角 · ${identityLabel(state.identity)}`
            : `叙述以「${characterName}」的「我」展开 · ${identityLabel(state.identity)}`}
        </p>
      </section>

      <section>
        <h4>时间</h4>
        <p>{state.date.display}</p>
        <p className="muted">节奏：{flowLabel(state.flow)}</p>
      </section>

      <section className="identity-status">
        <h4>身份</h4>
        <p className="big" style={{ fontSize: 14 }}>{identityGuides[state.identity].label}</p>
        <p className="muted">{identityGuides[state.identity].shortDesc}</p>
        <p className="muted small">身份会随你的行为变化——剧情节奏与视角随之改变</p>
      </section>

      <section>
        <h4>关系</h4>
        <ul className="relations">
          {Object.values(state.relations).map((r) => (
            <li key={r.name}>
              <span className="rel-name">{r.name}</span>
              <span className="rel-note">{r.note ?? "—"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4>线索</h4>
        {state.clues.length === 0 ? (
          <p className="muted">尚未发现</p>
        ) : (
          <ul className="clues">
            {state.clues.slice(-6).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </section>

      {state.activeChain && (
        <section className="chain-section">
          <h4>事件链</h4>
          <p>
            {state.activeChain.id} · 第 {state.activeChain.step}/{state.activeChain.totalSteps} 节
          </p>
        </section>
      )}

      {summaryStatus?.text && (
        <section>
          <h4>滚动摘要</h4>
          <p className="muted">已折叠 {summaryStatus.collapsedUntilIndex} 条历史</p>
        </section>
      )}

      {(queueLength !== undefined || prefetching) && (
        <section>
          <h4>叙事缓冲</h4>
          <p className="muted">
            队列剩余 {queueLength ?? 0} 段
            {prefetching ? " · 后台预取中" : ""}
          </p>
        </section>
      )}

      {trace && (
        <section className="trace">
          <h4>调度信息（开发）</h4>
          <p className="muted">Mode: {trace.mode}</p>
          {trace.outputMode && (
            <p className="muted">Output: {trace.outputMode}{trace.adapterMode ? ` -> ${trace.adapterMode} adapter` : ""}</p>
          )}
          <p className="muted">Preset: {trace.presetName}</p>
          {trace.promptOrderCharacterId !== undefined && (
            <p className="muted">ST order: {trace.promptOrderCharacterId}</p>
          )}
          {trace.promptOrderSource && (
            <p className="muted small">Order source: {trace.promptOrderSource}</p>
          )}
          {trace.enabledPromptCount !== undefined && (
            <p className="muted">Enabled prompts: {trace.enabledPromptCount}</p>
          )}
          {trace.messageCount !== undefined && (
            <p className="muted">Messages: {trace.messageCount}</p>
          )}
          {trace.naturalTextLength !== undefined && (
            <p className="muted small">Natural text: {trace.naturalTextLength} chars</p>
          )}
          <p className="muted">激活条目：</p>
          <ul className="trace-list">
            {trace.activeLoreEntries.slice(0, 6).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {trace.markerHits?.length ? (
            <>
              <p className="muted">Marker hits：</p>
              <ul className="trace-list">
                {trace.markerHits.slice(0, 8).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </>
          ) : null}
          {trace.regexHits?.length ? (
            <p className="muted small">Regex hits: {trace.regexHits.slice(0, 4).join(" / ")}</p>
          ) : null}
          {trace.macroVariables?.length ? (
            <p className="muted small">Macro vars: {trace.macroVariables.slice(0, 6).join(" / ")}</p>
          ) : null}
          {trace.unresolvedMacros?.length ? (
            <p className="muted small">Unresolved macros: {trace.unresolvedMacros.slice(0, 4).join(" / ")}</p>
          ) : null}
          {trace.filteredLoreEntries?.length ? (
            <p className="muted small">过滤条目：{trace.filteredLoreEntries.join("、")}</p>
          ) : null}
          {trace.warnings?.length ? (
            <p className="muted small">警告：{trace.warnings.slice(0, 2).join(" / ")}</p>
          ) : null}
        </section>
      )}
    </aside>
  );
}

function flowLabel(flow: WorldState["flow"]): string {
  return { monthly: "1 次 1 月", biweekly: "1 次 2 周", weekly: "1 次 1 周", chain: "事件链" }[flow];
}

function identityLabel(id: WorldState["identity"]): string {
  return {
    passerby: "路人学生",
    fringe: "SOS 团边缘",
    core: "SOS 团核心",
    anomaly: "异常存在",
    observer: "观察者",
  }[id];
}
