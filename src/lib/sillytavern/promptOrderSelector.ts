import type { SillyTavernPromptOrder } from "./presetTypes";

export type PromptOrderSelectionSource =
  | "preferred-character-id"
  | "openai-global-dummy-id"
  | "enabled-most"
  | "prompt-original-order";

export type PromptOrderSelection = {
  order: SillyTavernPromptOrder | null;
  source: PromptOrderSelectionSource;
};

const OPENAI_GLOBAL_DUMMY_ID = 100001;

export function selectSillyTavernPromptOrder(
  orders: SillyTavernPromptOrder[] | undefined,
  options: { preferredCharacterId?: number } = {},
): PromptOrderSelection {
  if (!Array.isArray(orders) || orders.length === 0) {
    return { order: null, source: "prompt-original-order" };
  }

  if (options.preferredCharacterId !== undefined) {
    const preferred = orders.find((order) => order.character_id === options.preferredCharacterId);
    if (preferred) return { order: preferred, source: "preferred-character-id" };
  }

  const openAiGlobal = orders.find((order) => order.character_id === OPENAI_GLOBAL_DUMMY_ID);
  if (openAiGlobal) {
    return { order: openAiGlobal, source: "openai-global-dummy-id" };
  }

  return {
    order: [...orders].sort((a, b) => countEnabled(b) - countEnabled(a))[0] ?? null,
    source: "enabled-most",
  };
}

function countEnabled(order: SillyTavernPromptOrder): number {
  return order.order.filter((item) => item.enabled).length;
}
