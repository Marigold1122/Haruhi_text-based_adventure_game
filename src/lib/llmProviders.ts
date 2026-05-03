// 真实 LLM 适配器：OpenAI 兼容 + Anthropic Messages API
//
// 注意安全：apiKey 只放浏览器 localStorage，并直接 POST 到 provider。
// 生产部署建议加一层后端代理避免 key 泄露给观察者。

import type { ChatMessage } from "@/types/turn";
import type { SamplingParams } from "@/types/preset";
import type { LLMCall } from "./llm";
import type { LLMSettings } from "./settings";

// ------------------------------------------------------------------
// OpenAI 兼容（含 OpenRouter / DeepSeek / 本地 LM Studio / Ollama）
// ------------------------------------------------------------------

export const openAICompatibleLLM = (settings: LLMSettings): LLMCall =>
  async (messages, sampling) => {
    if (!settings.apiKey && !settings.baseURL.includes("localhost")) {
      throw new Error("尚未配置 API key。点击右上角「设置」录入。");
    }

    const body: Record<string, unknown> = {
      model: settings.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: sampling.temperature ?? settings.temperature ?? 0.9,
      top_p: sampling.top_p,
      max_tokens: sampling.max_tokens ?? settings.maxTokens ?? 1100,
      presence_penalty: sampling.presence_penalty,
      frequency_penalty: sampling.frequency_penalty,
    };
    if (isOfficialDeepSeekEndpoint(settings)) {
      // DeepSeek V4 thinking defaults to enabled. Creative writing should use
      // non-thinking mode so temperature/top_p take effect and latency stays low.
      body.thinking = { type: "disabled" };
    }

    const res = await fetch(`${stripTrailing(settings.baseURL)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(formatHttpError(res.status, text, settings.baseURL));
    }
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("LLM 返回空内容");
    return content;
  };

// ------------------------------------------------------------------
// Anthropic Messages API（与 OpenAI 协议不同，单独实现）
// ------------------------------------------------------------------

export const anthropicLLM = (settings: LLMSettings): LLMCall =>
  async (messages, sampling) => {
    if (!settings.apiKey) throw new Error("尚未配置 Anthropic API key。");

    // Anthropic 要求把 system 单独抽出，messages 只允许 user / assistant
    const systems = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Anthropic 要求第一条必须是 user；如果没有，加一条占位
    if (turns.length === 0 || turns[0].role !== "user") {
      turns.unshift({ role: "user", content: "（开始故事）" });
    }

    const body: Record<string, unknown> = {
      model: settings.model,
      system: systems,
      messages: turns,
      max_tokens: sampling.max_tokens ?? settings.maxTokens ?? 1100,
      temperature: sampling.temperature ?? settings.temperature ?? 0.9,
    };
    if (sampling.top_p !== undefined) body.top_p = sampling.top_p;

    const res = await fetch(`${stripTrailing(settings.baseURL)}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(formatHttpError(res.status, text, settings.baseURL));
    }
    const data = await res.json();
    // Anthropic 返回 content 数组
    const content: string = (data?.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    if (!content) throw new Error("Anthropic 返回空内容");
    return content;
  };

// ------------------------------------------------------------------
// 简单的 retry + 超时包装
// ------------------------------------------------------------------

export const withRetry =
  (impl: LLMCall, retries = 1, timeoutMs = 90_000): LLMCall =>
  async (messages: ChatMessage[], sampling: SamplingParams) => {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await Promise.race([
          impl(messages, sampling),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error(`LLM 请求超时 ${timeoutMs}ms`)), timeoutMs),
          ),
        ]);
      } catch (e) {
        lastErr = e;
        if (i < retries) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
    throw lastErr;
  };

function stripTrailing(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function isOfficialDeepSeekEndpoint(settings: LLMSettings): boolean {
  try {
    const host = new URL(settings.baseURL).host.toLowerCase();
    return host === "api.deepseek.com" || host.endsWith(".api.deepseek.com");
  } catch {
    return settings.baseURL.toLowerCase().includes("api.deepseek.com");
  }
}

function formatHttpError(status: number, body: string, baseURL: string): string {
  const tail = body.slice(0, 240);
  if (status === 401 || status === 403) {
    return [
      `LLM 鉴权失败（HTTP ${status}） — Base URL: ${baseURL}`,
      "排查清单：",
      "1) API key 是否完整复制（开头 sk- 是否漏字符 / 末尾是否带换行或空格）",
      "2) key 是否与该 Base URL 对应（OpenAI 的 key 用不到 DeepSeek 的 URL，反之亦然）",
      "3) 控制台里 key 是否仍有效、账号是否已充值/开通",
      `服务方原始信息：${tail}`,
    ].join("\n");
  }
  if (status === 404) {
    return `LLM 端点未找到（HTTP 404） — 请检查 Base URL 是否正确（OpenAI 兼容应以 /v1 结尾）。原始信息：${tail}`;
  }
  if (status === 429) {
    return `LLM 限流（HTTP 429） — 请稍候重试或检查账号配额。原始信息：${tail}`;
  }
  return `LLM 请求失败 ${status}: ${tail}`;
}
