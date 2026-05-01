import type { StoryTurn } from "@/types/turn";

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
              {t.chain && (
                <span className="tag chain">
                  事件链 {t.chain.id} · {t.chain.step}/{t.chain.totalSteps}
                </span>
              )}
            </div>
          </header>
          <p className="narration">{t.narration}</p>
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
