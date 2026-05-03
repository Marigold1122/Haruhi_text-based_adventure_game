import type { PromptMode } from "@/lib/prompting/types";
import type { SillyTavernPresetSummary } from "./presetTypes";

const MODE_KEY = "haruhi-text-adventure:prompt-mode:v1";
const PRESET_KEY = "haruhi-text-adventure:sillytavern-preset:v1";
const WRITER_ADAPTER_MIGRATION_KEY = "haruhi-text-adventure:writer-adapter-default:v1";

export type StoredSillyTavernPreset = {
  fileName: string;
  raw: string;
  summary: SillyTavernPresetSummary;
  diagnostics: string[];
  savedAt: string;
};

export function loadPromptMode(): PromptMode {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "writer-adapter") {
      return raw;
    }
    if (raw === "legacy") {
      if (!localStorage.getItem(WRITER_ADAPTER_MIGRATION_KEY)) {
        localStorage.setItem(WRITER_ADAPTER_MIGRATION_KEY, "1");
        localStorage.setItem(MODE_KEY, "writer-adapter");
        return "writer-adapter";
      }
      return "legacy";
    }
    if (raw === "sillytavern-preset" || raw === "sillytavern-preset-natural") {
      return raw;
    }
    if (!localStorage.getItem(WRITER_ADAPTER_MIGRATION_KEY)) {
      localStorage.setItem(WRITER_ADAPTER_MIGRATION_KEY, "1");
      localStorage.setItem(MODE_KEY, "writer-adapter");
      return "writer-adapter";
    }
    return "writer-adapter";
  } catch {
    return "writer-adapter";
  }
}

export function savePromptMode(mode: PromptMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // ignore
  }
}

export function loadStoredSillyTavernPreset(): StoredSillyTavernPreset | null {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSillyTavernPreset;
    if (!parsed.raw || !parsed.summary) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredSillyTavernPreset(preset: StoredSillyTavernPreset): void {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(preset));
  } catch {
    // ignore
  }
}

export function clearStoredSillyTavernPreset(): void {
  try {
    localStorage.removeItem(PRESET_KEY);
  } catch {
    // ignore
  }
}

