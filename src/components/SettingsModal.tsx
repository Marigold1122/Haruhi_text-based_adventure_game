import { useState } from "react";
import { type LLMSettings, type ProviderId, baseUrlPresets, saveSettings } from "@/lib/settings";
import { refreshLLM, runLLMText } from "@/lib/llm";
import type { PromptMode } from "@/lib/prompting/types";
import { parseSillyTavernPresetJson } from "@/lib/sillytavern/presetParser";
import {
  clearStoredSillyTavernPreset,
  loadPromptMode,
  loadStoredSillyTavernPreset,
  savePromptMode,
  saveStoredSillyTavernPreset,
  type StoredSillyTavernPreset,
} from "@/lib/sillytavern/presetStorage";
import { SillyTavernPresetEditor } from "./SillyTavernPresetEditor";

type Props = {
  initial: LLMSettings;
  onClose: (s: LLMSettings) => void;
};

export function SettingsModal({ initial, onClose }: Props) {
  const [s, setS] = useState<LLMSettings>(initial);
  const [promptMode, setPromptMode] = useState<PromptMode>(() => loadPromptMode());
  const [storedPreset, setStoredPreset] = useState<StoredSillyTavernPreset | null>(() => loadStoredSillyTavernPreset());
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);

  function set<K extends keyof LLMSettings>(k: K, v: LLMSettings[K]) {
    setS((cur) => ({ ...cur, [k]: v }));
  }

  function applyPreset(label: string) {
    const p = baseUrlPresets.find((x) => x.label === label);
    if (!p) return;
    setS((cur) => ({
      ...cur,
      baseURL: p.url,
      provider: p.provider,
      ...(p.model ? { model: p.model } : {}),
    }));
  }

  function commit() {
    saveSettings(s);
    savePromptMode(promptMode);
    refreshLLM(s);
    onClose(s);
  }

  function updatePromptMode(mode: PromptMode) {
    setPromptMode(mode);
    savePromptMode(mode);
  }

  async function importSillyTavernPreset(file: File | undefined) {
    if (!file) return;
    setPresetMsg(null);
    try {
      const raw = await file.text();
      const parsed = parseSillyTavernPresetJson(raw, file.name.replace(/\.json$/i, ""));
      const stored: StoredSillyTavernPreset = {
        fileName: file.name,
        raw,
        summary: parsed.summary,
        diagnostics: parsed.diagnostics,
        savedAt: new Date().toISOString(),
      };
      saveStoredSillyTavernPreset(stored);
      setStoredPreset(stored);
      updatePromptMode("sillytavern-preset");
      setPresetMsg(`已导入：${parsed.summary.name}`);
    } catch (e) {
      setPresetMsg(`导入失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function clearSillyTavernPreset() {
    clearStoredSillyTavernPreset();
    savePromptMode("legacy");
    setPromptMode("legacy");
    setStoredPreset(null);
    setPresetMsg("已清除 ST 预设，回到 legacy 模式。");
  }

  function updateSillyTavernPreset(next: StoredSillyTavernPreset, message: string) {
    saveStoredSillyTavernPreset(next);
    setStoredPreset(next);
    updatePromptMode("sillytavern-preset");
    setPresetMsg(message);
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
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
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

        <label>
          <span>Prompt 模式</span>
          <select
            value={promptMode}
            onChange={(e) => updatePromptMode(e.target.value as PromptMode)}
          >
            <option value="legacy">Legacy：项目内置 promptRouter</option>
            <option value="sillytavern-preset">SillyTavern Preset：按 prompt_order 编译</option>
          </select>
          <small className="hint">
            ST 模式会旁路项目内置文风 preset，仅保留最小 event_json 接口契约。
          </small>
        </label>

        <section className="st-preset-settings">
          <div className="st-editor-head">
            <div>
              <strong>SillyTavern 预设设置</strong>
              <small>导入 preset 后会显示酒馆式 prompt 条目开关和内容编辑。</small>
            </div>
          </div>

          <label>
            <span>Preset JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                void importSillyTavernPreset(e.currentTarget.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            {storedPreset ? (
              <small className="hint">
                已加载：{storedPreset.summary.name} · prompts {storedPreset.summary.promptCount} · prompt_order {storedPreset.summary.promptOrderCount} · regex {storedPreset.summary.regexScriptCount}
                {storedPreset.summary.sourceMaxTokens ? ` · source max tokens ${storedPreset.summary.sourceMaxTokens}` : ""}
              </small>
            ) : (
              <small className="hint">未导入 preset。这里不会再隐藏；选择 JSON 后会自动启用 ST 模式并显示条目设置。</small>
            )}
          </label>

          {storedPreset ? (
            <SillyTavernPresetEditor
              storedPreset={storedPreset}
              onChange={updateSillyTavernPreset}
            />
          ) : (
            <div className="st-empty-note">
              当前没有已加载的 ST 预设。请导入 `夏瑾 双鱼座 Beta 0.40.json` 或其他 SillyTavern Chat Completion preset。
            </div>
          )}
        </section>

        <div className="modal-actions">
          <button className="ghost-btn" onClick={testConnection} disabled={testing}>
            {testing ? "测试中…" : "测试连接"}
          </button>
          <button className="ghost-btn" onClick={clearSillyTavernPreset}>清除 ST 预设</button>
          <div className="spacer" />
          <button className="ghost-btn" onClick={() => onClose(initial)}>取消</button>
          <button className="primary-btn" onClick={commit}>保存</button>
        </div>

        {testMsg && <div className="test-msg">{testMsg}</div>}
        {presetMsg && <div className="test-msg">{presetMsg}</div>}
        {storedPreset?.diagnostics.length ? (
          <div className="test-msg">
            {storedPreset.diagnostics.join(" / ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
