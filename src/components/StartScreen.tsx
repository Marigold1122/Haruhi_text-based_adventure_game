import { useState } from "react";
import type { CharacterCardV2 } from "@/types/character";
import type { IdentityLevel } from "@/types/lorebook";
import { generateRandomCharacter } from "@/lib/randomMode";
import { downloadCardJson } from "@/lib/cardIO";
import { identityGuides } from "@/data/identityGuide";
import { SettingsModal } from "./SettingsModal";
import { loadSettings } from "@/lib/settings";
import { ThinkingTimer } from "./ThinkingTimer";

type Props = {
  onStart: (opts: { card: CharacterCardV2; identity: IdentityLevel }) => void;
};

const identityOptions: IdentityLevel[] = ["passerby", "fringe", "core", "anomaly", "observer"];

export function StartScreen({ onStart }: Props) {
  const [name, setName] = useState("");
  const [background, setBackground] = useState("");
  const [personality, setPersonality] = useState("");
  const [identity, setIdentity] = useState<IdentityLevel>("passerby");
  const [showSettings, setShowSettings] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [card, setCard] = useState<CharacterCardV2 | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    if (!background.trim() || !personality.trim()) {
      setErr("请填写背景与性格");
      return;
    }
    setGenerating(true);
    setErr(null);
    setCard(null);
    try {
      const c = await generateRandomCharacter({
        name: name.trim() || undefined,
        background: background.trim(),
        personality: personality.trim(),
        identity,
      });
      setCard(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  function start() {
    if (!card) return;
    onStart({ card, identity });
  }

  return (
    <div className="start-screen">
      <header className="start-header">
        <div>
          <h1>凉宫春日 · 北口高校</h1>
          <p className="subtitle">原创角色 · AI 互动小说 · 你以一名新生身份入学北高，与 SOS 团相遇</p>
        </div>
        <div className="start-actions">
          <button className="ghost-btn" onClick={() => setShowSettings(true)}>LLM 设置</button>
        </div>
      </header>

      <section className="start-section">
        <h2>1. 你的角色</h2>
        <p className="muted small">填写后由 LLM 生成符合 V2 spec 的角色卡。所有这些会通过角色卡 description / personality 影响后续叙述。</p>

        <label className="form-row">
          <span>姓名（可留空，由 LLM 命名）</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：佐藤悠"
          />
        </label>

        <label className="form-row">
          <span>出身 / 背景</span>
          <textarea
            rows={3}
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="例如：父亲是大学物理教授，母亲是图书管理员。中学三年都在天文社。从邻县刚搬来。"
          />
        </label>

        <label className="form-row">
          <span>性格</span>
          <textarea
            rows={3}
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="例如：好奇但不张扬，说话喜欢绕弯子，独处时会自言自语。"
          />
        </label>
      </section>

      <section className="start-section">
        <h2>2. 身份</h2>
        <p className="muted small">身份决定你和 SOS 团相遇与卷入的方式，对剧情影响显著。游戏过程中会随你的行为变化。</p>
        <div className="identity-grid">
          {identityOptions.map((id) => {
            const g = identityGuides[id];
            return (
              <button
                key={id}
                className={`identity-card ${id === identity ? "active" : ""}`}
                onClick={() => setIdentity(id)}
              >
                <div className="identity-name">{g.label}</div>
                <div className="identity-desc">{g.shortDesc}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="start-section">
        <h2>3. 起点</h2>
        <p className="muted small">固定起点：北口高校入学日（2002 年 4 月 8 日）—— 凉宫春日的开场宣言即将上演。</p>
      </section>

      <section className="start-section">
        {!card ? (
          <button className="start-button" onClick={generate} disabled={generating}>
            {generating ? (
              <>
                正在生成你的角色卡…… <ThinkingTimer active={generating} />
              </>
            ) : "生成角色卡"}
          </button>
        ) : (
          <div className="card-preview">
            <h3>{card.data.name}</h3>
            <p className="muted">{card.data.description.split("\n").slice(0, 2).join("　")}</p>
            <p className="muted">{card.data.personality.split("\n")[0]}</p>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => downloadCardJson(card)}>导出 JSON</button>
              <button className="ghost-btn" onClick={() => setCard(null)}>重新生成</button>
              <div className="spacer" />
              <button className="primary-btn" onClick={start}>开始故事 →</button>
            </div>
          </div>
        )}

        {err && <div className="test-msg">{err}</div>}

        <p className="start-note">
          架构按 SillyTavern V2 spec 拼装：角色卡 + 世界书（30+ 条目，原作设定）+ 世界事件时间表 + 身份指引 + Author's Note + Rolling Summary。
        </p>
      </section>

      {showSettings && (
        <SettingsModal initial={loadSettings()} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
