// 用户配置：API key / baseURL / model / provider 选择
// 全部存 localStorage（前端直连模式；不要把 key 写进代码库）

export type ProviderId = "mock" | "openai" | "anthropic";

export type LLMSettings = {
  provider: ProviderId;
  baseURL: string;       // OpenAI 兼容：默认 https://api.openai.com/v1；OpenRouter / DeepSeek / 本地 vLLM 替换即可
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

const KEY = "haruhi-text-adventure:llm:v1";

const defaults: LLMSettings = {
  provider: "mock",
  baseURL: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  temperature: 0.9,
  // 一个完整的 turn（narration 200 字 + dialogue 3-5 条 + stateChanges + choices）通常 1200-1700 中文 token，
  // 默认拉到 2000 留出余量；reasoning 模型（deepseek-reasoner / o-series）建议手动调到 4000+。
  maxTokens: 2000,
};

export function loadSettings(): LLMSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(s: LLMSettings): void {
  try {
    const sanitized: LLMSettings = {
      ...s,
      apiKey: s.apiKey.trim(),
      baseURL: s.baseURL.trim().replace(/\/+$/, ""),
      model: s.model.trim(),
    };
    localStorage.setItem(KEY, JSON.stringify(sanitized));
  } catch {
    // ignore
  }
}

// 常用 baseURL 预设，方便用户切换
export const baseUrlPresets: Array<{ label: string; url: string; provider: ProviderId; modelHint: string }> = [
  { label: "OpenAI", url: "https://api.openai.com/v1", provider: "openai", modelHint: "gpt-4o / gpt-4o-mini" },
  { label: "OpenRouter", url: "https://openrouter.ai/api/v1", provider: "openai", modelHint: "anthropic/claude-3.5-sonnet 等" },
  { label: "DeepSeek", url: "https://api.deepseek.com/v1", provider: "openai", modelHint: "deepseek-chat / deepseek-reasoner" },
  { label: "Anthropic", url: "https://api.anthropic.com/v1", provider: "anthropic", modelHint: "claude-3-5-sonnet-latest" },
  { label: "本地 LM Studio / vLLM / Ollama", url: "http://localhost:1234/v1", provider: "openai", modelHint: "随本地配置" },
];
