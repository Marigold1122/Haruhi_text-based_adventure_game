// 原作角色卡——玩家不再扮演这些角色（1.0 之后转为原创角色随机模式）
// 这些卡仍保留：作为世界书 + LLM 参考资料，让 AI 在剧情中遇到这些 NPC 时能稳定还原原作风味。
//
// 在剧情中遇到某个原作角色时，promptRouter 可以把对应卡的 description / personality 简化版作为附加上下文注入。
// 玩家通过 random mode 创建自己的原创角色卡作为 POV。

import type { CharacterCardV2 } from "@/types/character";
import { kyonCard } from "./kyon";
import { haruhiCard } from "./haruhi";
import { nagatoCard } from "./nagato";
import { asahinaCard } from "./asahina";
import { koizumiCard } from "./koizumi";

/** NPC 参考库——key 是简短 id，便于 narration 中识别后注入 */
export const npcReferenceCards: Record<string, CharacterCardV2> = {
  kyon: kyonCard,
  haruhi: haruhiCard,
  nagato: nagatoCard,
  asahina: asahinaCard,
  koizumi: koizumiCard,
};
