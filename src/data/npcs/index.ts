// NPC 轻量卡——缩减字段（只保留 name + description + speech_style + situation）
// 不作为玩家可选 POV，仅在涉及该 NPC 的事件中作为附加 prompt 注入。

export type NpcCard = {
  id: string;
  name: string;
  description: string;
  speech_style: string;
  situation?: string; // 当前处境（可被起点覆盖）
  identity_gate?: string[]; // 仅在玩家身份在该集合时显形
};

export const npcRegistry: Record<string, NpcCard> = {
  asakura: {
    id: "asakura",
    name: "朝仓凉子",
    description: "北高一年五班委员长，标准美少女，学业满分。也是信息统合思念体派遣的另一名接口——'激进派'。",
    speech_style: "温柔得不像活人；语尾爱用「呢」「哦」，但下手时极快。",
    situation: "本时点尚未对阿虚动手，被长门压制。",
    identity_gate: ["fringe", "core", "anomaly", "observer"],
  },
  kyon_sister: {
    id: "kyon_sister",
    name: "阿虚妹妹",
    description: "小学五年级，活力旺盛，常爬到阿虚床上叫他起床。",
    speech_style: "「哥哥——！」「我也要去！」语速快、感叹号多。",
  },
  tsuruya: {
    id: "tsuruya",
    name: "鹤屋学姐",
    description: "北高二年级，朝比奈实玖瑠的好朋友，开朗外向、笑声响亮。家世据说极为复杂。",
    speech_style: "「哈！」「真有意思——！」常笑。",
    situation: "对春日的'怪异'毫无畏惧，反而觉得有趣。",
  },
  kimidori: {
    id: "kimidori",
    name: "喜绿江美里",
    description: "北高某社团成员，看似普通，实则又一名思念体接口（温和派）。",
    speech_style: "彬彬有礼，措辞极其工整。",
    identity_gate: ["core", "anomaly", "observer"],
  },
  kuyou: {
    id: "kuyou",
    name: "周防九曜",
    description: "佐佐木一派的代表人物，外表苍白沉默的少女。来自'天盖领域'——与思念体对立的另一类信息生命。",
    speech_style: "断句极慢，字与字之间留长间隙。",
    situation: "佐佐木一派出现后才登场。",
    identity_gate: ["core", "anomaly", "observer"],
  },
  tachibana: {
    id: "tachibana",
    name: "橘京子",
    description: "佐佐木阵营的超能力者少女，确信佐佐木才是世界中心，对春日抱有强烈对立。",
    speech_style: "活泼但带强迫式说服欲。",
    situation: "佐佐木一派出现后才登场。",
    identity_gate: ["core", "anomaly", "observer"],
  },
};

export function pickRelevantNpcs(
  identity: string,
  scanText: string,
): NpcCard[] {
  const out: NpcCard[] = [];
  for (const npc of Object.values(npcRegistry)) {
    if (npc.identity_gate && !npc.identity_gate.includes(identity)) continue;
    if (scanText.includes(npc.name)) out.push(npc);
  }
  return out;
}

export function formatNpcCard(n: NpcCard): string {
  const lines = [`# ${n.name}`, n.description, `说话风格：${n.speech_style}`];
  if (n.situation) lines.push(`当前处境：${n.situation}`);
  return lines.join("\n");
}
