import type { CharacterCardV2 } from "@/types/character";
import { kyonCard } from "./kyon";
import { haruhiCard } from "./haruhi";
import { nagatoCard } from "./nagato";
import { asahinaCard } from "./asahina";
import { koizumiCard } from "./koizumi";

export const characterRegistry: Record<string, CharacterCardV2> = {
  kyon: kyonCard,
  haruhi: haruhiCard,
  nagato: nagatoCard,
  asahina: asahinaCard,
  koizumi: koizumiCard,
};

export const playableCharacterIds = Object.keys(characterRegistry);
