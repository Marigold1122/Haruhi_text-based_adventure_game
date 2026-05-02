import { useEffect, useMemo, useState } from "react";
import { parseSillyTavernPresetJson } from "@/lib/sillytavern/presetParser";
import type { StoredSillyTavernPreset } from "@/lib/sillytavern/presetStorage";
import type {
  SillyTavernChatCompletionPreset,
  SillyTavernPrompt,
  SillyTavernPromptOrder,
} from "@/lib/sillytavern/presetTypes";

type Props = {
  storedPreset: StoredSillyTavernPreset;
  onChange: (next: StoredSillyTavernPreset, message: string) => void;
};

export function SillyTavernPresetEditor({ storedPreset, onChange }: Props) {
  const parsed = useMemo(() => {
    try {
      return {
        error: null,
        ...parseSillyTavernPresetJson(storedPreset.raw, storedPreset.summary.name),
      };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : String(e),
        preset: null,
        diagnostics: [],
        summary: storedPreset.summary,
      };
    }
  }, [storedPreset.raw, storedPreset.summary]);

  const promptById = useMemo(() => {
    const map = new Map<string, SillyTavernPrompt>();
    for (const prompt of parsed.preset?.prompts ?? []) {
      if (prompt.identifier) map.set(prompt.identifier, prompt);
    }
    return map;
  }, [parsed.preset]);

  const activeOrderIndex = useMemo(() => choosePromptOrderIndex(parsed.preset?.prompt_order), [parsed.preset]);
  const activeOrder = activeOrderIndex >= 0 ? parsed.preset?.prompt_order?.[activeOrderIndex] : undefined;
  const orderedItems = activeOrder?.order ?? [];
  const enabledCount = orderedItems.filter((item) => item.enabled).length;

  const [activePromptId, setActivePromptId] = useState<string | null>(orderedItems[0]?.identifier ?? null);
  const activePrompt = activePromptId ? promptById.get(activePromptId) : undefined;
  const activeContent = typeof activePrompt?.content === "string" ? activePrompt.content : "";
  const [draftContent, setDraftContent] = useState(activeContent);

  useEffect(() => {
    if (!orderedItems.length) {
      setActivePromptId(null);
      return;
    }
    if (!activePromptId || !orderedItems.some((item) => item.identifier === activePromptId)) {
      setActivePromptId(orderedItems[0].identifier);
    }
  }, [activePromptId, orderedItems]);

  useEffect(() => {
    setDraftContent(activeContent);
  }, [activePromptId, activeContent]);

  if (parsed.error) {
    return <div className="test-msg">ST 预设解析失败：{parsed.error}</div>;
  }

  if (!activeOrder) {
    return (
      <section className="st-prompt-editor">
        <div className="st-editor-head">
          <div>
            <strong>ST Prompt 条目</strong>
            <small>当前 preset 没有 prompt_order，暂时无法按酒馆顺序编辑开关。</small>
          </div>
        </div>
      </section>
    );
  }

  function updatePresetRaw(
    edit: (preset: SillyTavernChatCompletionPreset) => void,
    message: string,
  ) {
    try {
      const nextPreset = JSON.parse(storedPreset.raw) as SillyTavernChatCompletionPreset;
      edit(nextPreset);
      const raw = JSON.stringify(nextPreset, null, 2);
      const reparsed = parseSillyTavernPresetJson(raw, storedPreset.summary.name);
      onChange(
        {
          ...storedPreset,
          raw,
          summary: reparsed.summary,
          diagnostics: reparsed.diagnostics,
          savedAt: new Date().toISOString(),
        },
        message,
      );
    } catch (e) {
      onChange(storedPreset, `保存 ST 预设失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function setPromptEnabled(identifier: string, enabled: boolean) {
    updatePresetRaw((preset) => {
      const order = preset.prompt_order?.[activeOrderIndex];
      const item = order?.order.find((candidate) => candidate.identifier === identifier);
      if (item) item.enabled = enabled;
    }, `${enabled ? "已启用" : "已关闭"}：${promptTitle(promptById.get(identifier), identifier)}`);
  }

  function savePromptContent() {
    if (!activePromptId || !activePrompt || activePrompt.marker) return;
    updatePresetRaw((preset) => {
      const prompt = preset.prompts?.find((candidate) => candidate.identifier === activePromptId);
      if (prompt) prompt.content = draftContent;
    }, `已保存条目：${promptTitle(activePrompt, activePromptId)}`);
  }

  const canEditContent = Boolean(activePrompt && !activePrompt.marker);
  const contentChanged = canEditContent && draftContent !== activeContent;

  return (
    <section className="st-prompt-editor">
      <div className="st-editor-head">
        <div>
          <strong>ST Prompt 条目</strong>
          <small>
            当前编译使用 prompt_order {activeOrder.character_id ?? activeOrderIndex + 1} · 启用 {enabledCount}/{orderedItems.length}
          </small>
        </div>
        <span className="st-editor-badge">即时保存到本地 preset</span>
      </div>

      <div className="st-editor-grid">
        <div className="st-prompt-list">
          {orderedItems.map((item) => {
            const prompt = promptById.get(item.identifier);
            const title = promptTitle(prompt, item.identifier);
            return (
              <div
                key={item.identifier}
                className={`st-prompt-row ${activePromptId === item.identifier ? "active" : ""} ${item.enabled ? "" : "muted"}`}
              >
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => setPromptEnabled(item.identifier, e.currentTarget.checked)}
                  aria-label={`${item.enabled ? "关闭" : "启用"} ${title}`}
                />
                <button
                  type="button"
                  className="st-prompt-select"
                  onClick={() => setActivePromptId(item.identifier)}
                >
                  <span className="st-prompt-title">{title}</span>
                  <span className="st-prompt-meta">
                    {prompt?.role ?? "user"} · {prompt?.marker ? "marker" : "prompt"} · {contentLength(prompt)} 字符
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="st-prompt-detail">
          {activePrompt ? (
            <>
              <div className="st-detail-title">{promptTitle(activePrompt, activePromptId ?? "")}</div>
              <div className="st-detail-meta">
                <span>{activePrompt.identifier}</span>
                <span>role: {activePrompt.role ?? "user"}</span>
                <span>{activePrompt.marker ? "marker" : "prompt"}</span>
              </div>

              {activePrompt.marker ? (
                <div className="st-marker-note">
                  这是 marker 条目，实际内容由当前角色卡、世界信息或聊天历史在运行时替换。第一版只暴露开关，不直接编辑 marker 内容。
                </div>
              ) : (
                <>
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.currentTarget.value)}
                    rows={12}
                    spellCheck={false}
                  />
                  <div className="st-detail-actions">
                    <button className="primary-btn" type="button" onClick={savePromptContent} disabled={!contentChanged}>
                      保存条目
                    </button>
                    <button className="ghost-btn" type="button" onClick={() => setDraftContent(activeContent)} disabled={!contentChanged}>
                      还原草稿
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="st-marker-note">这个 order item 没有匹配到 prompts 条目，编译时会跳过。</div>
          )}
        </div>
      </div>
    </section>
  );
}

function choosePromptOrderIndex(orders: SillyTavernPromptOrder[] | undefined): number {
  if (!Array.isArray(orders) || orders.length === 0) return -1;
  let bestIndex = 0;
  let bestEnabled = countEnabled(orders[0]);
  for (let i = 1; i < orders.length; i += 1) {
    const enabled = countEnabled(orders[i]);
    if (enabled > bestEnabled) {
      bestEnabled = enabled;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function countEnabled(order: SillyTavernPromptOrder): number {
  return order.order.filter((item) => item.enabled).length;
}

function promptTitle(prompt: SillyTavernPrompt | undefined, fallback: string): string {
  return prompt?.name?.trim() || fallback;
}

function contentLength(prompt: SillyTavernPrompt | undefined): number {
  return typeof prompt?.content === "string" ? prompt.content.length : 0;
}
