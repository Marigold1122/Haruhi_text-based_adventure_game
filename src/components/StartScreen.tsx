import { useState } from "react";
import type { CharacterCardV2 } from "@/types/character";
import type { IdentityLevel } from "@/types/lorebook";
import { generateRandomCharacter } from "@/lib/randomMode";
import { mbtiQuiz } from "@/data/mbtiQuiz";
import { matchArchetype, type MatchResult } from "@/lib/personalityMatcher";
import { archetypeInfo } from "@/data/characterArchetypes";
import { SettingsModal } from "./SettingsModal";
import { loadSettings } from "@/lib/settings";
import { MBTIQuiz } from "./MBTIQuiz";
import { ArchetypeReveal } from "./ArchetypeReveal";
import { ThinkingTimer } from "./ThinkingTimer";

type Props = {
  onStart: (opts: { card: CharacterCardV2; identity: IdentityLevel }) => void;
};

type Stage = "intro" | "quiz" | "reveal" | "generating" | "error";

export function StartScreen({ onStart }: Props) {
  const [stage, setStage] = useState<Stage>("intro");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function onQuizComplete(answers: number[]) {
    const result = matchArchetype(answers, mbtiQuiz);
    setMatch(result);
    setStage("reveal");
  }

  async function onSupplementConfirm(supplement: string, name: string) {
    if (!match) return;
    setStage("generating");
    setErr(null);
    try {
      const card = await generateRandomCharacter({
        name: name || undefined,
        match,
        supplement: supplement || undefined,
      });
      const identity =
        (card.data.extensions?.default_identity as IdentityLevel | undefined) ??
        archetypeInfo[match.archetype].defaultIdentity;
      onStart({ card, identity });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStage("error");
    }
  }

  // 不同 stage 的渲染
  if (stage === "intro") {
    return (
      <div className="start-screen">
        <header className="start-header">
          <div>
            <h1>凉宫春日 · 北口高校</h1>
            <p className="subtitle">
              AI 互动小说 · 你将以一个原创高一新生的身份入学北高，与 SOS 团相遇。
            </p>
          </div>
          <div className="start-actions">
            <button className="ghost-btn" onClick={() => setShowSettings(true)}>LLM 设置</button>
          </div>
        </header>

        <section className="start-section intro-block">
          <h2>开始之前</h2>
          <p className="intro-text">
            为了让你的角色更贴合真实自我，我们准备了 10 道<strong>凉宫风味的 MBTI 测试</strong>——
            题目场景贴近你日常会遇到的处境，但带一丝凉宫世界的氛围。
          </p>
          <p className="intro-text">
            根据你的回答，会形成一份 8 维人格画像（活力 / 沉稳 / 共情 / 好奇 / 理性 / 主导 / 效率 / 自省），
            与 8 个原作角色（凉宫春日 / 阿虚 / 长门 / 朝比奈 / 古泉 / 鹤屋 / 朝仓 / 佐佐木）的画像比对，最近的即为你的人格原型。
            匹配结果会与你随后的补充信息一起，由 AI 为你打造一张独一无二的角色卡。
          </p>
          <p className="intro-text muted small">
            首次使用请先点右上「LLM 设置」配置 API（默认 Mock 模式可直接演示，但生成卡需要真实 LLM）。
          </p>
          <button className="start-button" onClick={() => setStage("quiz")}>
            开始测试 →
          </button>
        </section>

        {showSettings && (
          <SettingsModal initial={loadSettings()} onClose={() => setShowSettings(false)} />
        )}
      </div>
    );
  }

  if (stage === "quiz") {
    return <MBTIQuiz onComplete={onQuizComplete} />;
  }

  if (stage === "reveal" && match) {
    return <ArchetypeReveal match={match} onConfirm={onSupplementConfirm} />;
  }

  if (stage === "generating") {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="loading-tag">生成中</div>
          <h2>正在为你打造原创角色卡……</h2>
          <p className="muted">
            AI 正在结合你的人格原型与补充信息，生成一张独一无二的 V2 角色卡。
            根据网络情况，这可能需要 10-40 秒。
          </p>
          <div className="loading-dots"><span /><span /><span /></div>
          <div className="loading-timer">
            <ThinkingTimer active={true} />
          </div>
        </div>
      </div>
    );
  }

  // stage === "error"
  return (
    <div className="loading-screen">
      <div className="loading-card error">
        <div className="loading-tag" style={{ background: "var(--accent)" }}>生成失败</div>
        <h2>角色卡生成失败</h2>
        <p className="error-msg">{err}</p>
        <div className="loading-actions">
          <button className="ghost-btn" onClick={() => setShowSettings(true)}>检查 LLM 设置</button>
          <button className="primary-btn" onClick={() => setStage("intro")}>重新开始</button>
        </div>
        {showSettings && (
          <SettingsModal initial={loadSettings()} onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  );
}
