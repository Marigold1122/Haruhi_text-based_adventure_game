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
  // 本轮场景配置——精确说明在场/不在场的人，强制 LLM 不要把不该出现的角色塞进来
  sceneCast: string;
};

const baseRelations = {
  kyon: { name: "阿虚", trust: 0, affection: 0, note: "未接触" },
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
      "四月。樱花未尽。你在一年五班的教室里，身后那个系着黄色丝带的女生正要做出震惊全班的自我介绍。",
    defaultLorebookId: "hsuzumiya_lore",
    allowedCharacters: ["kyon", "haruhi", "nagato", "asahina"],
    sceneCast: [
      "【本轮场景：北高入学日（4 月 8 日上午）】",
      "在场（一年五班教室）：阿虚、凉宫春日（坐阿虚正后方）、谷口、国木田、朝仓凉子（委员长）、本班其他普通同学、班主任。",
      "在场（一年六班教室）：长门有希（独自看书，未与外界接触）。",
      "在场（二年级自己班里）：朝比奈实玖瑠（与 SOS 团尚无任何交集）、鹤屋学姐。",
      "**绝对不在场（不得出现在本场景）**：",
      "  · 朝比奈实玖瑠——她是二年级，不会出现在一年五班教室。",
      "  · 古泉一树——他还没转入北高，4 月入学日时整个北高没有这个人。",
      "  · SOS 团成员的'团内互动'——SOS 团此时尚未成立。",
      "  · 闭锁空间 / 神人 / 任何超自然现象。",
      "本轮焦点：凉宫春日的入学自我介绍宣言；阿虚被她钉在'后排'位置上。",
    ].join("\n"),
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
    allowedCharacters: ["kyon", "haruhi", "nagato", "asahina", "koizumi"],
    sceneCast: [
      "【本轮场景：SOS 团刚成立（5 月中旬，电研社事件之后）】",
      "在场（文艺部部室，旧馆三楼）：阿虚、凉宫春日（团长）、长门有希（窗边看书）、朝比奈实玖瑠（被强行拽来，正在泡茶或换 cosplay）、古泉一树（已转入北高加入团）。",
      "外部已知：电研社那台电脑刚被讹来；袖章墨迹未干；春日刚下达过几次第一批'团长命令'。",
      "**不在场**：佐佐木（在别的高中，不会突然出现在北高）、橘京子 / 九曜 / 藤原（佐佐木一派尚未登场）、闭锁空间 / 神人（除非满足度低到临界）。",
      "本轮焦点：SOS 团内部互动、团长突发奇想的活动、社团室日常细节。",
    ].join("\n"),
    initialState: {
      identity: "core",
      date: { iso: "2002-05-13", display: "高一 春 · SOS 团创立周（5 月）" },
      flow: "weekly",
      haruhiSatisfaction: 10,
      worldStability: 85,
      playerStress: 20,
      relations: {
        kyon: { name: "阿虚", trust: 40, affection: 15, note: "同被春日折腾" },
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
    allowedCharacters: ["kyon", "haruhi", "nagato", "asahina", "koizumi"],
    sceneCast: [
      "【本轮场景：孤岛事件之夏（8 月 17 日，暑假后期）】",
      "在场（孤岛别墅）：阿虚、凉宫春日、长门有希、朝比奈实玖瑠、古泉一树（即 SOS 团全员）。",
      "在场（别墅主人方）：多丸氏家族成员（古泉的远房亲戚），其中一位'长兄'即将在'剧本'里成为今晚的'死者'。",
      "外部环境：台风将至，渡船将停航至少 24 小时；夜深风急。",
      "**不在场**：北高其他同学（暑假状态）、谷口 / 国木田（不在 SOS 团出游名单）、佐佐木一派（尚未登场）。",
      "本轮焦点：本格推理'暴风雪山庄'布局；古泉视角下知道这是一场剧；阿虚识破后选择是否配合演完。",
    ].join("\n"),
    initialState: {
      identity: "core",
      date: { iso: "2002-08-17", display: "高一 暑假 · 孤岛行（8 月 17 日）" },
      flow: "chain",
      haruhiSatisfaction: 25,
      worldStability: 70,
      playerStress: 35,
      relations: {
        kyon: { name: "阿虚", trust: 70, affection: 40, note: "同舟共济" },
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
