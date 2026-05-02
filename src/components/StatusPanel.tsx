import type { WorldState } from "@/types/worldState";
import type { SummaryState } from "@/lib/summary";
import { findOutline } from "@/data/storyOutlines";

type Props = {
  state: WorldState;
  characterName: string;
  trace?: { presetName: string; activeLoreEntries: string[] } | null;
  summaryStatus?: SummaryState | null;
};

export function StatusPanel({ state, characterName, trace, summaryStatus }: Props) {
  return (
    <aside className="status-panel">
      <section>
        <h4>第一人称 POV</h4>
        <p className="big">{characterName}</p>
        <p className="muted">叙述以「{characterName}」的「我」展开 · {identityLabel(state.identity)}</p>
      </section>

      <section>
        <h4>时间</h4>
        <p>{state.date.display}</p>
        <p className="muted">节奏：{flowLabel(state.flow)}</p>
      </section>

      {(() => {
        const outline = findOutline(state.startingPoint);
        if (!outline) return null;
        const idx = Math.min(state.currentBeatIndex, outline.beats.length - 1);
        const cur = outline.beats[idx];
        return (
          <section>
            <h4>剧情进度</h4>
            <p className="big" style={{ fontSize: 14 }}>{cur.title}</p>
            <p className="muted">第 {idx + 1} / {outline.beats.length} 节拍 · {cur.pace === "summary" ? "概括" : "实时"}</p>
          </section>
        );
      })()}

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

      {trace && (
        <section className="trace">
          <h4>调度信息（开发）</h4>
          <p className="muted">Preset: {trace.presetName}</p>
          <p className="muted">激活条目：</p>
          <ul className="trace-list">
            {trace.activeLoreEntries.slice(0, 6).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
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
