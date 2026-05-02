import { useRef, useState } from "react";
import { startingPoints } from "@/data/startingPoints";
import { characterRegistry } from "@/data/characters";
import { loadCardFromFile } from "@/lib/cardIO";
import type { StartingPointId } from "@/types/worldState";
import type { CharacterCardV2 } from "@/types/character";
import { SettingsModal } from "./SettingsModal";
import { RandomModeForm } from "./RandomModeForm";
import { loadSettings } from "@/lib/settings";

type Props = {
  onStart: (opts: { startingPointId: StartingPointId; characterId: string; customCard?: CharacterCardV2 }) => void;
};

export function StartScreen({ onStart }: Props) {
  const [pointId, setPointId] = useState<StartingPointId>(startingPoints[0].id);
  const point = startingPoints.find((p) => p.id === pointId)!;
  const allowedChars = point.allowedCharacters;
  const [charId, setCharId] = useState<string>(allowedChars[0]);
  const [importedCard, setImportedCard] = useState<CharacterCardV2 | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showRandom, setShowRandom] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const setPoint = (id: StartingPointId) => {
    setPointId(id);
    const next = startingPoints.find((p) => p.id === id)!;
    if (!next.allowedCharacters.includes(charId) && !importedCard) {
      setCharId(next.allowedCharacters[0]);
    }
  };

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const card = await loadCardFromFile(file);
    if (!card) {
      alert("JSON 不是合法的 V2 角色卡。");
      return;
    }
    setImportedCard(card);
  }

  function start() {
    onStart({
      startingPointId: pointId,
      characterId: importedCard ? "__custom__" : charId,
      customCard: importedCard ?? undefined,
    });
  }

  return (
    <div className="start-screen">
      <header className="start-header">
        <div>
          <h1>凉宫春日 · 北口高校</h1>
          <p className="subtitle">AI 驱动的校园 · 异常 · 互动小说（1.0 sample）</p>
        </div>
        <div className="start-actions">
          <button className="ghost-btn" onClick={() => setShowSettings(true)}>LLM 设置</button>
          <button className="ghost-btn" onClick={() => setShowRandom(true)}>随机模式</button>
          <button className="ghost-btn" onClick={() => fileInput.current?.click()}>导入 JSON 卡</button>
          <input ref={fileInput} type="file" accept="application/json" onChange={onImport} hidden />
        </div>
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
        <h2>选择第一人称视角</h2>
        {importedCard ? (
          <div className="char-row">
            <button className="char-card active">
              <div className="char-name">{importedCard.data.name}（自定义）</div>
              <div className="char-tags">{(importedCard.data.tags ?? []).slice(0, 3).join(" · ")}</div>
              <div className="char-desc">{importedCard.data.personality.split("\n")[0]}</div>
            </button>
            <button className="char-card" onClick={() => setImportedCard(null)}>
              <div className="char-name">取消自定义</div>
              <div className="char-desc">回到内置角色列表</div>
            </button>
          </div>
        ) : (
          <div className="char-row">
            {allowedChars.map((id) => {
              const c = characterRegistry[id];
              if (!c) return null;
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
        )}
      </section>

      <section className="start-section">
        <button className="start-button" onClick={start}>开始故事</button>
        <p className="start-note">
          架构按 SillyTavern V2 spec 拼装：角色卡 + 世界书 + Preset + Author's Note + Rolling Summary。
          首次使用请先点「LLM 设置」配置 API（默认 Mock 模式可直接演示）。
        </p>
      </section>

      {showSettings && (
        <SettingsModal initial={loadSettings()} onClose={() => setShowSettings(false)} />
      )}
      {showRandom && (
        <RandomModeForm
          onCancel={() => setShowRandom(false)}
          onCardReady={(card) => {
            setImportedCard(card);
            setShowRandom(false);
          }}
        />
      )}
    </div>
  );
}
