// 原作角色卡——玩家不再扮演这些角色（1.0 之后转为原创角色随机模式）
// 这些卡保留：作为世界书 + LLM 参考资料，让 AI 在剧情中遇到这些 NPC 时能稳定还原原作风味。

import type { CharacterCardV2 } from "@/types/character";
import { kyonCard } from "./kyon";
import { haruhiCard } from "./haruhi";
import { nagatoCard } from "./nagato";
import { asahinaCard } from "./asahina";
import { koizumiCard } from "./koizumi";
import { asakuraCard } from "./asakura";
import { taniguchiCard } from "./taniguchi";
import { kunikidaCard } from "./kunikida";
import { tsuruyaCard } from "./tsuruya";
import { sasakiCard } from "./sasaki";

/** NPC 参考库——key 是简短 id，便于 narration 中识别后注入 */
export const npcReferenceCards: Record<string, CharacterCardV2> = {
  // SOS 团核心成员
  kyon: kyonCard,
  haruhi: haruhiCard,
  nagato: nagatoCard,
  asahina: asahinaCard,
  koizumi: koizumiCard,
  // 次要角色
  asakura: asakuraCard,
  taniguchi: taniguchiCard,
  kunikida: kunikidaCard,
  tsuruya: tsuruyaCard,
  sasaki: sasakiCard,
};
