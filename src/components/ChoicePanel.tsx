import { useState } from "react";

type Props = {
  choices: string[];
  disabled: boolean;
  onChoose: (text: string) => void;
};

export function ChoicePanel({ choices, disabled, onChoose }: Props) {
  const [custom, setCustom] = useState("");

  const submitCustom = () => {
    const text = custom.trim();
    if (!text || disabled) return;
    onChoose(text);
    setCustom("");
  };

  return (
    <div className="choice-panel">
      <div className="choice-buttons">
        {choices.map((c, i) => (
          <button
            key={i}
            className="choice-btn"
            disabled={disabled}
            onClick={() => onChoose(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="custom-input">
        <textarea
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="输入你的行动，例如：我走到长门桌边问她在看什么"
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
