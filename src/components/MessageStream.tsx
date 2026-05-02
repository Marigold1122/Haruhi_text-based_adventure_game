import { useEffect, useState } from "react";
import type { StoryTurn, TimeAdvance } from "@/types/turn";
import { ThinkingTimer } from "./ThinkingTimer";

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
  onDeleteLatest?: () => void;
  onRegenerateLatest?: () => void;
  onUpdateLatest?: (turn: StoryTurn) => void;
};

export function MessageStream({
  turns,
  pendingUserAction,
  loading,
  onDeleteLatest,
  onRegenerateLatest,
  onUpdateLatest,
}: Props) {
  const [editingLatest, setEditingLatest] = useState(false);
  const [draftNarration, setDraftNarration] = useState("");
  const latestIndex = turns.length - 1;

  useEffect(() => {
    setEditingLatest(false);
    setDraftNarration(turns[latestIndex]?.narration ?? "");
  }, [latestIndex, turns]);

  function saveLatestEdit(turn: StoryTurn) {
    onUpdateLatest?.({ ...turn, narration: draftNarration });
    setEditingLatest(false);
  }

  return (
    <div className="message-stream">
      {turns.map((t, i) => {
        const isLatest = i === latestIndex;
        return (
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
          {isLatest && (
            <div className="turn-actions">
              <button className="mini-btn" onClick={() => onDeleteLatest?.()} disabled={loading || !onDeleteLatest}>删除</button>
              <button className="mini-btn" onClick={() => onRegenerateLatest?.()} disabled={loading || !onRegenerateLatest}>重新生成</button>
              <button
                className="mini-btn"
                onClick={() => {
                  setDraftNarration(t.narration);
                  setEditingLatest(true);
                }}
                disabled={loading || !onUpdateLatest}
              >
                修改句子
              </button>
            </div>
          )}
          {isLatest && editingLatest ? (
            <div className="turn-editor">
              <textarea
                value={draftNarration}
                onChange={(e) => setDraftNarration(e.currentTarget.value)}
                rows={8}
              />
              <div className="turn-editor-actions">
                <button className="primary-btn" onClick={() => saveLatestEdit(t)}>保存修改</button>
                <button className="ghost-btn" onClick={() => setEditingLatest(false)}>取消</button>
              </div>
            </div>
          ) : (
            <p className="narration">{t.narration}</p>
          )}
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
        );
      })}

      {pendingUserAction && (
        <div className="pending-user">你：{pendingUserAction}</div>
      )}

      {loading && (
        <div className="loading">
          叙事正在推进<span className="dots">...</span>
          <ThinkingTimer active={loading} />
        </div>
      )}
    </div>
  );
}
