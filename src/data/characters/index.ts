import type { CharacterCardV2 } from "@/types/character";
import { kyonCard } from "./kyon";
import { haruhiCard } from "./haruhi";

export const characterRegistry: Record<string, CharacterCardV2> = {
  kyon: kyonCard,
  haruhi: haruhiCard,
};

export const playableCharacterIds = Object.keys(characterRegistry);
