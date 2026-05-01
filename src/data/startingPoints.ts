import type { StartingPointId, WorldState } from "@/types/worldState";

export type StartingPointDef = {
  id: StartingPointId;
  title: string;
  subtitle: string;
  description: string;
  // 默认绑定的世界书 id 与默认 Preset（按事件类型映射时再细化）
  defaultLorebookId: string;
  // 起始世界状态
  initialState: Omit<WorldState, "playerCharacterId">;
  // 该起点允许的角色 id（根据"起点不得晚于关键事件"的约束筛选）
  allowedCharacters: string[];
};

const baseRelations = {
  haruhi: { name: "凉宫春日", trust: 0, affection: 0, note: "未知" },
  nagato: { name: "长门有希", trust: 0, affection: 0, note: "未接触" },
  asahina: { name: "朝比奈实玖瑠", trust: 0, affection: 0, note: "未接触" },
  koizumi: { name: "古泉一树", trust: 0, affection: 0, note: "未出现" },
};

export const startingPoints: StartingPointDef[] = [
  {
    id: "north_high_entrance",
    title: "北高入学日",
    subtitle: "原作起点",
    description:
      "四月。樱花未尽。你在一年五班的教室里，身后那个扎红丝带的女生正要做出震惊全班的自我介绍。",
    defaultLorebookId: "hsuzumiya_lore",
    allowedCharacters: ["kyon", "haruhi"],
    initialState: {
      identity: "fringe",
      date: { iso: "2002-04-08", display: "高一 春 · 入学日（4 月 8 日）" },
      flow: "biweekly",
      haruhiSatisfaction: 0,
      worldStability: 90,
      playerStress: 10,
      relations: { ...baseRelations },
      flags: ["entrance_day"],
      clues: [],
      pastEvents: [],
      activeChain: null,
      startingPoint: "north_high_entrance",
    },
  },
  {
    id: "sos_founded",
    title: "SOS 团刚成立",
    subtitle: "电研社事件之后",
    description:
      "五月。文艺部部室里，那台从电研社讹来的电脑还是温的。袖章上的 SOS 三字墨迹未干。",
    defaultLorebookId: "hsuzumiya_lore",
    allowedCharacters: ["kyon", "haruhi"],
    initialState: {
      identity: "core",
      date: { iso: "2002-05-13", display: "高一 春 · SOS 团创立周（5 月）" },
      flow: "weekly",
      haruhiSatisfaction: 10,
      worldStability: 85,
      playerStress: 20,
      relations: {
        haruhi: { name: "凉宫春日", trust: 30, affection: 20, note: "兴致正高" },
        nagato: { name: "长门有希", trust: 50, affection: 5, note: "沉默观察" },
        asahina: { name: "朝比奈实玖瑠", trust: 40, affection: 30, note: "被绑来的" },
        koizumi: { name: "古泉一树", trust: 30, affection: 10, note: "标准微笑" },
      },
      flags: ["sos_founded", "kidnapped_mikuru"],
      clues: [
        "电研社那台电脑是 SOS 团第一台电脑",
        "长门递给我一张奇怪的书签",
      ],
      pastEvents: ["凉宫春日的入学自我介绍", "电研社事件"],
      activeChain: null,
      startingPoint: "sos_founded",
    },
  },
  {
    id: "summer_island",
    title: "孤岛事件之夏",
    subtitle: "暑假突发",
    description:
      "暑假。古泉的远房亲戚邀请 SOS 团到一座孤岛别墅过暑假。台风将至。",
    defaultLorebookId: "hsuzumiya_lore",
    allowedCharacters: ["kyon", "haruhi"],
    initialState: {
      identity: "core",
      date: { iso: "2002-08-17", display: "高一 暑假 · 孤岛行（8 月 17 日）" },
      flow: "chain",
      haruhiSatisfaction: 25,
      worldStability: 70,
      playerStress: 35,
      relations: {
        haruhi: { name: "凉宫春日", trust: 60, affection: 50, note: "暑假高昂" },
        nagato: { name: "长门有希", trust: 75, affection: 20, note: "开始读侦探小说" },
        asahina: { name: "朝比奈实玖瑠", trust: 65, affection: 60, note: "泳装羞耻" },
        koizumi: { name: "古泉一树", trust: 55, affection: 30, note: "笑容标准" },
      },
      flags: ["summer_break", "island_invitation"],
      clues: [
        "古泉的远房亲戚提到'本格推理'",
        "台风预报已发布",
      ],
      pastEvents: [
        "凉宫春日的入学自我介绍",
        "电研社事件",
        "棒球大会",
        "拍摄朝比奈实玖瑠的冒险 episode 00",
      ],
      activeChain: null,
      startingPoint: "summer_island",
    },
  },
];

export const startingPointById: Record<StartingPointId, StartingPointDef | undefined> = Object.fromEntries(
  startingPoints.map((sp) => [sp.id, sp]),
) as Record<StartingPointId, StartingPointDef | undefined>;
