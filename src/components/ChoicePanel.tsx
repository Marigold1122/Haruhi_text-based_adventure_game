import { useState } from "react";

type Props = {
  choices: string[];
  requiresChoice: boolean;
  disabled: boolean;
  onChoose: (text: string) => void;
  onContinue: () => void;
};

export function ChoicePanel({ choices, requiresChoice, disabled, onChoose, onContinue }: Props) {
  const [custom, setCustom] = useState("");

  const submitCustom = () => {
    const text = custom.trim();
    if (!text || disabled) return;
    onChoose(text);
    setCustom("");
  };

  if (!requiresChoice) {
    // 日常 / 非关键节拍：玩家只能"继续"看故事推进
    return (
      <div className="choice-panel">
        <div className="continue-row">
          <button className="continue-btn" disabled={disabled} onClick={onContinue}>
            继续 →
          </button>
          <span className="continue-hint">
            故事按节拍自然推进 · 关键节点会开放选择
          </span>
        </div>
      </div>
    );
  }

  // 关键节拍：开放选项 + 自定义输入
  return (
    <div className="choice-panel">
      <div className="choice-hint">关键节点 · 选择你的行动</div>
      <div className="choice-buttons">
        {choices.map((c, i) => (
          <button key={i} className="choice-btn" disabled={disabled} onClick={() => onChoose(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="custom-input">
        <textarea
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="或输入自定义行动……例如：我走到长门桌边问她在看什么"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitCustom();
            }
          }}
        />
        <button className="custom-submit" disabled={disabled || !custom.trim()} onClick={submitCustom}>
          执行行动
        </button>
      </div>
    </div>
  );
}
