import { useEffect, useRef, useState } from "react";
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

function shouldShowAdvance(t: TimeAdvance): boolean {
  if (t.note) return true;
  if (t.days && t.days > 0) return true;
  if (t.hours && t.hours > 0) return true;
  if (t.minutes && t.minutes > 0) return true;
  return false;
}

type Props = {
  turns: StoryTurn[];
  pendingUserAction?: string | null;
  loading: boolean;
  /** 点击消息流（除了控制按钮 / 编辑器 / requiresChoice 段落）会触发，等同于点击「继续」按钮 */
  onAdvance?: () => void;
  onDeleteLatest?: () => void;
  onRegenerateLatest?: () => void;
  onUpdateLatest?: (turn: StoryTurn) => void;
};

export function MessageStream({
  turns,
  pendingUserAction,
  loading,
  onAdvance,
  onDeleteLatest,
  onRegenerateLatest,
  onUpdateLatest,
}: Props) {
  const [editingLatest, setEditingLatest] = useState(false);
  const [draftNarration, setDraftNarration] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const latestIndex = turns.length - 1;

  useEffect(() => {
    setEditingLatest(false);
    setDraftNarration(turns[latestIndex]?.narration ?? "");
  }, [latestIndex, turns]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns.length, pendingUserAction, loading]);

  function saveLatestEdit(turn: StoryTurn) {
    onUpdateLatest?.({ ...turn, narration: draftNarration });
    setEditingLatest(false);
  }

  const latestRequiresChoice = turns[turns.length - 1]?.requiresChoice ?? false;
  const canAdvance = !!onAdvance && !loading && !editingLatest && !latestRequiresChoice;

  function handleStreamClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canAdvance) return;
    // 不阻断点击：button / textarea / input 自己有 onClick，stopPropagation 由它们承担
    const target = e.target as HTMLElement;
    if (target.closest("button, textarea, input, .turn-editor")) return;
    onAdvance!();
  }

  return (
    <div
      className={`message-stream ${canAdvance ? "advance-clickable" : ""}`}
      onClick={handleStreamClick}
    >
      {turns.map((t, i) => {
        const isLatest = i === latestIndex;
        const isDialogueTurn = !!t.speaker;
        // 仅第一段（或事件标题不为空且与上一段不同）显示标题与场景标签——避免每个短段都重复 header
        const previousEventTitle = i > 0 ? turns[i - 1].eventTitle : "";
        const showHeader =
          !!t.eventTitle && t.eventTitle !== previousEventTitle &&
          (!!t.scene || !!t.time || !!t.mood || !!t.chain || i === 0);

        return (
          <article
            key={i}
            className={`turn-card ${isLatest ? "current" : "past"} ${isDialogueTurn ? "dialogue-turn" : "narration-turn"}`}
          >
            {showHeader && (
              <header className="turn-head">
                <h3>{t.eventTitle}</h3>
                <div className="turn-tags">
                  {t.scene && <span className="tag">{t.scene}</span>}
                  {t.time && <span className="tag">{t.time}</span>}
                  {!isDialogueTurn && t.mood && <span className="tag mood">{t.mood}</span>}
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
            )}

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
                  rows={6}
                />
                <div className="turn-editor-actions">
                  <button className="primary-btn" onClick={() => saveLatestEdit(t)}>保存修改</button>
                  <button className="ghost-btn" onClick={() => setEditingLatest(false)}>取消</button>
                </div>
              </div>
            ) : isDialogueTurn ? (
              <div className="dialogue-line standalone">
                <span className="speaker">{t.speaker}</span>
                {t.mood && <span className="speaker-mood">{t.mood}</span>}
                <p className="speech">「{t.narration}」</p>
              </div>
            ) : (
              <p className="narration">{t.narration}</p>
            )}

            {/* 兼容旧存档：dialogue 数组若有，仍渲染（新输出不会再填） */}
            {t.dialogue && t.dialogue.length > 0 && (
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

            {shouldShowAdvance(t.timeAdvance) && (
              <div className="time-advance">↪ {formatAdvance(t.timeAdvance)}</div>
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

      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
