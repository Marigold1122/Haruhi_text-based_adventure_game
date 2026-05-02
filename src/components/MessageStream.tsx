import type { StoryTurn, TimeAdvance } from "@/types/turn";

function formatAdvance(t: TimeAdvance): string {
  if (t.note) return t.note;
  const parts: string[] = [];
  if (t.days) parts.push(`${t.days} 天后`);
  if (t.hours) parts.push(`${t.hours} 小时后`);
  if (t.minutes) parts.push(`${t.minutes} 分钟后`);
  return parts.join(" / ") || "—";
}

type Props = {
  turns: StoryTurn[];
  pendingUserAction?: string | null;
  loading: boolean;
};

export function MessageStream({ turns, pendingUserAction, loading }: Props) {
  return (
    <div className="message-stream">
      {turns.map((t, i) => (
        <article key={i} className={`turn-card ${i === turns.length - 1 ? "current" : "past"}`}>
          <header className="turn-head">
            <h3>{t.eventTitle}</h3>
            <div className="turn-tags">
              {t.scene && <span className="tag">{t.scene}</span>}
              {t.time && <span className="tag">{t.time}</span>}
              {t.mood && <span className="tag mood">{t.mood}</span>}
              <span className={`tag pace ${t.pace}`}>
                {t.pace === "summary" ? "概括 · 跳过日常" : "实时场景"}
              </span>
              {t.chain && (
                <span className="tag chain">
                  事件链 {t.chain.id} · {t.chain.step}/{t.chain.totalSteps}
                </span>
              )}
            </div>
          </header>
          <p className="narration">{t.narration}</p>
          {(t.timeAdvance.note || t.timeAdvance.days || t.timeAdvance.hours || t.timeAdvance.minutes) && (
            <div className="time-advance">
              ↪ {formatAdvance(t.timeAdvance)}
            </div>
          )}
          {t.dialogue.length > 0 && (
            <div className="dialogue">
              {t.dialogue.map((d, j) => (
                <div key={j} className="dialogue-line">
                  <span className="speaker">{d.speaker}</span>
                  {d.mood && <span className="speaker-mood">{d.mood}</span>}
                  <p className="speech">「{d.text}」</p>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}

      {pendingUserAction && (
        <div className="pending-user">你：{pendingUserAction}</div>
      )}

      {loading && <div className="loading">叙事正在推进<span className="dots">...</span></div>}
    </div>
  );
}
