import { useState } from "react";
import { type LLMSettings, type ProviderId, baseUrlPresets, saveSettings } from "@/lib/settings";
import { refreshLLM, runLLMText } from "@/lib/llm";

type Props = {
  initial: LLMSettings;
  onClose: (s: LLMSettings) => void;
};

export function SettingsModal({ initial, onClose }: Props) {
  const [s, setS] = useState<LLMSettings>(initial);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  function set<K extends keyof LLMSettings>(k: K, v: LLMSettings[K]) {
    setS((cur) => ({ ...cur, [k]: v }));
  }

  function applyPreset(label: string) {
    const p = baseUrlPresets.find((x) => x.label === label);
    if (!p) return;
    setS((cur) => ({ ...cur, baseURL: p.url, provider: p.provider }));
  }

  function commit() {
    saveSettings(s);
    refreshLLM(s);
    onClose(s);
  }

  async function testConnection() {
    saveSettings(s);
    refreshLLM(s);
    setTesting(true);
    setTestMsg(null);
    try {
      const text = await runLLMText({
        messages: [{ role: "user", content: "请回复一个字：好" }],
        sampling: { temperature: 0.2, max_tokens: 20 },
      });
      setTestMsg(`连通成功：${text.slice(0, 30)}`);
    } catch (e) {
      setTestMsg(`失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(initial)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>LLM 设置</h2>

        <label>
          <span>Provider 模式</span>
          <select
            value={s.provider}
            onChange={(e) => set("provider", e.target.value as ProviderId)}
          >
            <option value="mock">Mock（无需联网，仅样品演示）</option>
            <option value="openai">OpenAI 兼容（OpenAI / OpenRouter / DeepSeek / 本地）</option>
            <option value="anthropic">Anthropic Messages API</option>
          </select>
        </label>

        <label>
          <span>常用预设</span>
          <div className="preset-row">
            {baseUrlPresets.map((p) => (
              <button key={p.label} className="preset-btn" onClick={() => applyPreset(p.label)}>
                {p.label}
              </button>
            ))}
          </div>
        </label>

        <label>
          <span>Base URL</span>
          <input
            type="text"
            value={s.baseURL}
            onChange={(e) => set("baseURL", e.target.value)}
            placeholder="https://api.openai.com/v1"
          />
        </label>

        <label>
          <span>API Key</span>
          <input
            type="password"
            value={s.apiKey}
            onChange={(e) => set("apiKey", e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
          />
          <small className="hint">
            Key 仅保存在浏览器 localStorage，会随请求直接发到上述 Base URL。生产部署请加后端代理。
          </small>
        </label>

        <label>
          <span>模型 ID</span>
          <input
            type="text"
            value={s.model}
            onChange={(e) => set("model", e.target.value)}
            placeholder="gpt-4o-mini / claude-3-5-sonnet-latest / deepseek-chat"
          />
        </label>

        <div className="row">
          <label>
            <span>Temperature</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="2"
              value={s.temperature ?? 0.9}
              onChange={(e) => set("temperature", Number(e.target.value))}
            />
          </label>
          <label>
            <span>Max Tokens</span>
            <input
              type="number"
              min="200"
              max="8000"
              value={s.maxTokens ?? 1100}
              onChange={(e) => set("maxTokens", Number(e.target.value))}
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="ghost-btn" onClick={testConnection} disabled={testing}>
            {testing ? "测试中…" : "测试连接"}
          </button>
          <div className="spacer" />
          <button className="ghost-btn" onClick={() => onClose(initial)}>取消</button>
          <button className="primary-btn" onClick={commit}>保存</button>
        </div>

        {testMsg && <div className="test-msg">{testMsg}</div>}
      </div>
    </div>
  );
}
