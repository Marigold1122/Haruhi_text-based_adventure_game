import { useEffect, useState } from "react";
import { mbtiQuiz, type QuizQuestion } from "@/data/mbtiQuiz";

type Props = {
  onComplete: (answers: number[]) => void;
};

/**
 * 10 道凉宫风味 MBTI 测试。
 * 每题 4 个选项，玩家点击后 ~250ms 淡出，下一题淡入。
 */
export function MBTIQuiz({ onComplete }: Props) {
  const [current, setCurrent] = useState(0);          // 当前题号 0..9
  const [answers, setAnswers] = useState<number[]>([]); // 已选选项索引数组
  const [phase, setPhase] = useState<"in" | "out">("in"); // 淡入淡出阶段

  // 进入新题时触发淡入
  useEffect(() => {
    setPhase("in");
  }, [current]);

  function choose(optionIndex: number) {
    if (phase === "out") return;
    setPhase("out");
    const nextAnswers = [...answers, optionIndex];
    setAnswers(nextAnswers);
    setTimeout(() => {
      if (current + 1 >= mbtiQuiz.length) {
        onComplete(nextAnswers);
      } else {
        setCurrent(current + 1);
      }
    }, 280);
  }

  const q: QuizQuestion = mbtiQuiz[current];

  return (
    <div className="quiz-screen">
      <header className="quiz-header">
        <span className="quiz-progress">第 {current + 1} / {mbtiQuiz.length} 题</span>
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
              className="quiz-option"
              onClick={() => choose(i)}
              disabled={phase === "out"}
            >
              <span className="quiz-option-letter">{["A", "B", "C", "D"][i]}</span>
              <span className="quiz-option-text">{opt.text}</span>
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
