import { useState } from "react";
import { startingPoints } from "@/data/startingPoints";
import { characterRegistry } from "@/data/characters";
import type { StartingPointId } from "@/types/worldState";

type Props = {
  onStart: (opts: { startingPointId: StartingPointId; characterId: string }) => void;
};

export function StartScreen({ onStart }: Props) {
  const [pointId, setPointId] = useState<StartingPointId>(startingPoints[0].id);
  const point = startingPoints.find((p) => p.id === pointId)!;
  const allowedChars = point.allowedCharacters;
  const [charId, setCharId] = useState<string>(allowedChars[0]);

  // 切起点时把 charId 固定到 allowed 列表里
  const setPoint = (id: StartingPointId) => {
    setPointId(id);
    const next = startingPoints.find((p) => p.id === id)!;
    if (!next.allowedCharacters.includes(charId)) {
      setCharId(next.allowedCharacters[0]);
    }
  };

  return (
    <div className="start-screen">
      <header className="start-header">
        <h1>凉宫春日：北口高校</h1>
        <p className="subtitle">AI 驱动的校园 · 异常 · 互动小说</p>
      </header>

      <section className="start-section">
        <h2>选择起点</h2>
        <div className="start-points">
          {startingPoints.map((p) => (
            <button
              key={p.id}
              className={`point-card ${p.id === pointId ? "active" : ""}`}
              onClick={() => setPoint(p.id)}
            >
              <div className="point-title">{p.title}</div>
              <div className="point-subtitle">{p.subtitle}</div>
              <div className="point-desc">{p.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="start-section">
        <h2>选择视角</h2>
        <div className="char-row">
          {allowedChars.map((id) => {
            const c = characterRegistry[id];
            return (
              <button
                key={id}
                className={`char-card ${id === charId ? "active" : ""}`}
                onClick={() => setCharId(id)}
              >
                <div className="char-name">{c.data.name}</div>
                <div className="char-tags">{c.data.tags.slice(0, 3).join(" · ")}</div>
                <div className="char-desc">{c.data.personality.split("\n")[0]}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="start-section">
        <button className="start-button" onClick={() => onStart({ startingPointId: pointId, characterId: charId })}>
          开始故事
        </button>
        <p className="start-note">
          当前为本地 mock LLM 演示模式。世界书 / 角色卡 / Preset 完全按 SillyTavern V2 spec 拼装。
        </p>
      </section>
    </div>
  );
}
