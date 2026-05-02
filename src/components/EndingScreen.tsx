import type { EndingTrigger } from "@/lib/ending";
import { endingLabel } from "@/lib/ending";

type Props = {
  ending: EndingTrigger;
  characterName: string;
  text: string | null;     // null 表示生成中
  error?: string | null;
  onRestart: () => void;
};

export function EndingScreen({ ending, characterName, text, error, onRestart }: Props) {
  return (
    <div className="ending-screen">
      <div className="ending-card">
        <header>
          <span className="ending-tag">盖棺定论</span>
          <h1>{endingLabel(ending.type)}</h1>
          <p className="muted">主角：{characterName}</p>
        </header>

        {error && <div className="ending-error">{error}</div>}

        {text === null ? (
          <p className="ending-loading">正在让 LLM 喂完整历史生成结局小传……</p>
        ) : (
          <article className="ending-text">
            {text.split(/\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </article>
        )}

        <footer>
          <button className="primary-btn" onClick={onRestart}>开始新的故事</button>
        </footer>
      </div>
    </div>
  );
}
