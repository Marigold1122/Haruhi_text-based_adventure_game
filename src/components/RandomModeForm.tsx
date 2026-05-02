import { useState } from "react";
import type { CharacterCardV2 } from "@/types/character";
import { generateRandomCharacter } from "@/lib/randomMode";
import { downloadCardJson } from "@/lib/cardIO";

type Props = {
  onCardReady: (card: CharacterCardV2) => void;
  onCancel: () => void;
};

export function RandomModeForm({ onCardReady, onCancel }: Props) {
  const [bg, setBg] = useState("北高一年五班，戴眼镜的转学生，从京都搬来");
  const [pers, setPers] = useState("怕生但好奇，喜欢观察人，记忆力极好");
  const [start, setStart] = useState("北高入学日");
  const [hint, setHint] = useState<string>("fringe");
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CharacterCardV2 | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setErr(null); setCard(null);
    try {
      const c = await generateRandomCharacter({
        background: bg, personality: pers, startingPoint: start, identityHint: hint,
      });
      setCard(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal random-modal" onClick={(e) => e.stopPropagation()}>
        <h2>随机模式 · 生成新角色卡</h2>
        <p className="muted">由当前 LLM 生成符合 Character Card V2 spec 的全新卡，可玩可导出。</p>

        <label>
          <span>出身 / 背景</span>
          <textarea value={bg} onChange={(e) => setBg(e.target.value)} rows={2} />
        </label>
        <label>
          <span>性格</span>
          <textarea value={pers} onChange={(e) => setPers(e.target.value)} rows={2} />
        </label>
        <label>
          <span>起点</span>
          <input value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          <span>身份提示</span>
          <select value={hint} onChange={(e) => setHint(e.target.value)}>
            <option value="passerby">passerby（路人学生）</option>
            <option value="fringe">fringe（SOS 团边缘）</option>
            <option value="core">core（SOS 团核心）</option>
            <option value="anomaly">anomaly（异常存在）</option>
            <option value="observer">observer（观察者 / 操控者）</option>
          </select>
        </label>

        <div className="modal-actions">
          <div className="spacer" />
          <button className="ghost-btn" onClick={onCancel}>取消</button>
          <button className="primary-btn" onClick={generate} disabled={loading}>
            {loading ? "生成中…" : "生成"}
          </button>
        </div>

        {err && <div className="test-msg">{err}</div>}

        {card && (
          <div className="card-preview">
            <h3>{card.data.name}</h3>
            <p className="muted">{card.data.description.split("\n")[0]}</p>
            <p className="muted">{card.data.personality.split("\n")[0]}</p>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => downloadCardJson(card)}>导出 JSON</button>
              <button className="primary-btn" onClick={() => onCardReady(card)}>用这张卡开始</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
