import { useEffect, useState } from "react";
import { mbtiQuiz, type QuizQuestion } from "@/data/mbtiQuiz";

type Props = {
  onComplete: (answers: number[]) => void;
};

/**
 * 10 道凉宫风味 MBTI 测试。
 * - 点击选项后 ~280ms 淡出，下一题淡入
 * - 「← 上一题」按钮可回退；回到上一题时之前选过的答案会高亮显示
 */
export function MBTIQuiz({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  // 用稀疏数组：answers[i] 是第 i 题的选项索引（0-3）；undefined 表示未答
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    setPhase("in");
  }, [current]);

  function choose(optionIndex: number) {
    if (phase === "out") return;
    const nextAnswers = [...answers];
    nextAnswers[current] = optionIndex;
    setAnswers(nextAnswers);
    setPhase("out");
    setTimeout(() => {
      if (current + 1 >= mbtiQuiz.length) {
        // 此时所有 10 题答案完整
        onComplete(nextAnswers as number[]);
      } else {
        setCurrent(current + 1);
      }
    }, 280);
  }

  function goBack() {
    if (phase === "out" || current === 0) return;
    setPhase("out");
    setTimeout(() => setCurrent(current - 1), 280);
  }

  const q: QuizQuestion = mbtiQuiz[current];
  const previousChoice = answers[current];

  return (
    <div className="quiz-screen">
      <header className="quiz-header">
        <div className="quiz-header-row">
          <button
            className="quiz-back-btn"
            onClick={goBack}
            disabled={current === 0 || phase === "out"}
          >
            ← 上一题
          </button>
          <span className="quiz-progress">第 {current + 1} / {mbtiQuiz.length} 题</span>
          <span style={{ width: 70 }} />{/* 占位让 progress 居中 */}
        </div>
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${((current + 1) / mbtiQuiz.length) * 100}%` }}
          />
        </div>
      </header>

      <main className={`quiz-card ${phase === "in" ? "fade-in" : "fade-out"}`}>
        <div className="quiz-scene-tag">{q.scene}</div>
        <h2 className="quiz-prompt">{q.prompt}</h2>

        <div className="quiz-options">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className={`quiz-option ${previousChoice === i ? "previously-selected" : ""}`}
              onClick={() => choose(i)}
              disabled={phase === "out"}
            >
              <span className="quiz-option-letter">{["A", "B", "C", "D"][i]}</span>
              <span className="quiz-option-text">{opt.text}</span>
              {previousChoice === i && <span className="quiz-option-prev-tag">上次选择</span>}
            </button>
          ))}
        </div>
      </main>

      <footer className="quiz-footer">
        <p className="muted small">基于 10 道凉宫春日风味的 MBTI 测试 · 答完后将匹配你的人格原型</p>
      </footer>
    </div>
  );
}
