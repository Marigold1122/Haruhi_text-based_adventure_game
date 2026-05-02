// V2 角色卡 JSON 导入 / 导出
// PNG 嵌入卡（chub.ai / Tavern 流通格式）暂未支持，仅 JSON。

import type { CharacterCardV2 } from "@/types/character";

export function exportCardJson(card: CharacterCardV2): string {
  return JSON.stringify(card, null, 2);
}

export function downloadCardJson(card: CharacterCardV2, filename?: string): void {
  const text = exportCardJson(card);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${safeName(card.data.name)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseCardJson(text: string): CharacterCardV2 | null {
  try {
    const obj = JSON.parse(text);
    if (obj?.spec === "chara_card_v2" && obj?.data?.name) {
      return obj as CharacterCardV2;
    }
    // 兼容 V1：把字段塞到 data
    if (obj?.name && obj?.description) {
      return wrapV1(obj);
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadCardFromFile(file: File): Promise<CharacterCardV2 | null> {
  const text = await file.text();
  return parseCardJson(text);
}

function wrapV1(v1: Record<string, unknown>): CharacterCardV2 {
  const get = (k: string, fb = "") => (typeof v1[k] === "string" ? (v1[k] as string) : fb);
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: get("name"),
      description: get("description"),
      personality: get("personality"),
      scenario: get("scenario"),
      first_mes: get("first_mes"),
      mes_example: get("mes_example"),
      creator_notes: "",
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: [],
      tags: [],
      creator: "imported_v1",
      character_version: "0.1.0",
      extensions: {},
    },
  };
}

function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 40);
}
