// 凉宫春日原作事件时间线（Canon Event Timeline · Volumes 1-4）
//
// 这是凉宫春日系列原作小说前 4 卷里所有"中大型事件"和"SOS 团成员加入节点"的精确时间表。
// 用途：
//   1. 当 state.date 跨过 main_line 事件日期 → eventTrigger 强制触发该事件作为本轮焦点
//      （消失日 12-18 必须发生消失事件，长门加入必须发生在阿虚去过部室之前等）
//   2. flavor 事件被动注入 prompt 作为日常氛围素材
//   3. 派生 worldTimeline.ts 的 WorldEvent[]（向后兼容）
//
// 来源：萌娘百科 / 中文维基百科 / 百度百科 / Haruhi Wiki / Baka-Tsuki，多源交叉核对。
// 年份锚点：本游戏将"高一入学日"锚定为 2002-04-08。三年前的七夕（春日中一时期）= 1999-07-07。
// 卷次范围：1-4（《忧郁》《叹息》《烦闷》《消失》），后续会扩展卷 5-11。

export type CanonEvent = {
  /** 唯一 id（snake_case 英文） */
  id: string;
  /** 中文事件名 */
  title: string;
  date: {
    /** ISO 日期 YYYY-MM-DD（始终填，便于按日触发） */
    iso: string;
    /** 描述性日期，如「高一春 · 黄金周后」 */
    relative?: string;
    /** 是否为原著明示的精确日期（true）vs 推断日期（false） */
    precise: boolean;
  };
  /** 卷号 1-11 */
  volume: number;
  /**
   * 事件体量——决定推荐的批次数与互动数：
   *   small：1-2 批 / 1-2 次互动（蒙太奇 / 转场 / 简短对话场景）
   *   medium：2-3 批 / 2-4 次互动（标准场景，含展开与回应）
   *   large：4-6 批 / 4-8 次互动（关键转折、密集情感、原作里的高潮节点）
   */
  scope: "small" | "medium" | "large";
  /** main_line：日期到了必须触发，缺失则破坏主线；flavor：可作日常氛围出现 */
  importance: "main_line" | "flavor";
  /** 一两句中文总结 */
  summary: string;
  /** 涉及的原作角色 */
  participants: string[];
  /** 发生地点 */
  location?: string;
  /** 这事件在主线里起的作用 */
  narrativeFunction: string;
  /** 哪些身份的玩家原则上能感知 */
  visibility: "public" | "sos_internal" | "supernatural";
  /** 事件链 id（如有） */
  chainId?: string;
};

export const canonTimeline: CanonEvent[] = [
  // ============================================================
  // 卷 1：凉宫春日的忧郁
  // 时间跨度：2002-04 入学 ~ 2002-06/07 三天结局
  // ============================================================
  {
    id: "entrance_day_declaration",
    title: "入学日 · 凉宫春日的自我介绍宣言",
    date: { iso: "2002-04-08", precise: true },
    volume: 1,
    scope: "large",
    importance: "main_line",
    summary:
      "凉宫春日在一年五班自我介绍：「我对普通人类没兴趣，如果你们之中有外星人、未来人、异世界人、超能力者就直接来找我吧！」全班死寂。她坐在阿虚正后方（座位表分配）。",
    participants: ["凉宫春日", "阿虚", "谷口", "国木田", "朝仓凉子"],
    location: "北高一年五班教室",
    narrativeFunction: "系列起点宣言，定义春日的诉求并启动阿虚作为第一人称叙事的旁观立场。",
    visibility: "public",
  },
  {
    id: "hair_ribbon_week",
    title: "春日的彩带轮转周",
    date: {
      iso: "2002-04-09",
      relative: "高一春 · 入学第一周（每天换一种发型与彩带颜色）",
      precise: false,
    },
    volume: 1,
    scope: "small",
    importance: "flavor",
    summary:
      "春日入学后按月-火-水-木-金循环改变发型与彩带颜色（黄/红/蓝/绿/金）。阿虚某天忍不住搭话，由此打破班上没人敢理她的局面。",
    participants: ["凉宫春日", "阿虚"],
    location: "北高一年五班教室",
    narrativeFunction: "建立阿虚-春日的私人对话关系，是后续一切互动的前提。",
    visibility: "public",
  },
  {
    id: "haruhi_inspects_clubs",
    title: "春日开始系统性考察社团",
    date: { iso: "2002-04-15", relative: "高一春 · 入学约一周后", precise: false },
    volume: 1,
    scope: "small",
    importance: "flavor",
    summary:
      "凉宫春日依次去运动部、文艺部、各种研究会，每个都嫌弃。全校学生开始议论这个「怪人一年级女生」。",
    participants: ["凉宫春日"],
    location: "北高校园",
    narrativeFunction: "为下个月的「自建社团」做铺垫；强化春日的「对普通毫无耐心」标签。",
    visibility: "public",
  },
  {
    id: "haruhi_cuts_hair",
    title: "春日剪短发 · 转折信号",
    date: {
      iso: "2002-05-07",
      relative: "高一春 · 黄金周后第二天（紧接阿虚向她吐槽彩带的隔天）",
      precise: false,
    },
    volume: 1,
    scope: "small",
    importance: "main_line",
    summary:
      "在阿虚谈论她发型的隔天，春日把及腰长直发剪到肩膀长度的短发。阿虚意识到自己的话能影响她，关系进入下一阶段。",
    participants: ["凉宫春日", "阿虚"],
    location: "北高一年五班教室",
    narrativeFunction: "心理拐点：春日不再只是宣言型怪人，开始主动行动；也是「自建社团」的导火索。",
    visibility: "public",
  },
  {
    id: "sos_brigade_founded",
    title: "SOS 团成立宣言",
    date: {
      iso: "2002-05-12",
      relative: "高一春 · 黄金周后约一周（春日宣布自建社团）",
      precise: false,
    },
    volume: 1,
    scope: "medium",
    importance: "main_line",
    summary:
      "春日逛遍北高所有社团都没找到合适的，受阿虚一句话启发，宣布成立「让世界变得更热闹的凉宫春日团」即 SOS 团，强行拉阿虚入团。",
    participants: ["凉宫春日", "阿虚"],
    location: "北高一年五班教室",
    narrativeFunction: "主线舞台搭建：从此有了「团」这个组织框架，是后面所有成员加入与活动的容器。",
    visibility: "public",
  },
  {
    id: "nagato_joins",
    title: "长门有希加入 · 强占文艺部部室",
    date: {
      iso: "2002-05-13",
      relative: "高一春 · SOS 团成立翌日",
      precise: false,
    },
    volume: 1,
    scope: "large",
    importance: "main_line",
    summary:
      "春日为 SOS 团找据点，看中文艺部空教室，强行入侵后将唯一部员长门有希也「纳为」SOS 团成员。文艺部部室自此成为 SOS 团活动室。",
    participants: ["凉宫春日", "阿虚", "长门有希"],
    location: "北高文艺部部室（旧馆三楼最里侧）",
    narrativeFunction: "获得据点 + 第一位非阿虚团员；长门作为情报统合思念体接触装置正式登场，外星人线开启。",
    visibility: "sos_internal",
  },
  {
    id: "computer_society_incident",
    title: "电研社事件 · 抢电脑",
    date: {
      iso: "2002-05-16",
      relative: "高一春 · 长门加入后数日（约 2002-05 中旬）",
      precise: false,
    },
    volume: 1,
    scope: "medium",
    importance: "main_line",
    summary:
      "SOS 团活动室没电脑，春日带阿虚冲进电研社，演了一出朝比奈被「非礼」的现场，威胁讹来一台台式机。这是 SOS 团第一次「对外行动」。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "电研社社长"],
    location: "北高电研社教室",
    narrativeFunction: "获得活动室核心装备（电脑）；同时把朝比奈拖入团内的契机就此埋下。",
    visibility: "sos_internal",
  },
  {
    id: "mikuru_joins",
    title: "朝比奈实玖瑠加入 · 吉祥物兼女仆",
    date: {
      iso: "2002-05-23",
      relative: "高一春 · 电研社事件后（约 2002-05 下旬）",
      precise: false,
    },
    volume: 1,
    scope: "large",
    importance: "main_line",
    summary:
      "春日强行将二年级的朝比奈学姐拖到部室拉入 SOS 团并强迫穿女仆装。朝比奈随后单独向阿虚透露自己是来自未来的未来人，奉命观测春日。",
    participants: ["凉宫春日", "阿虚", "朝比奈实玖瑠", "长门有希"],
    location: "北高校内 → 文艺部部室",
    narrativeFunction: "团内补齐「未来人」要素；朝比奈成为阿虚视角下的萌点和未来情报来源。",
    visibility: "sos_internal",
  },
  {
    id: "koizumi_transfers_in",
    title: "古泉一树转学加入",
    date: {
      iso: "2002-06-03",
      relative: "高一春 · 朝比奈加入后不久（约 2002-06 初）",
      precise: false,
    },
    volume: 1,
    scope: "large",
    importance: "main_line",
    summary:
      "神秘转学生古泉一树突然出现并被春日一眼相中，毫无抵抗加入 SOS 团，凑齐五人。古泉随后向阿虚揭示自己是「机关」派来的超能力者。",
    participants: ["凉宫春日", "阿虚", "古泉一树", "长门有希", "朝比奈实玖瑠"],
    location: "北高一年九班 → 文艺部部室",
    narrativeFunction: "超能力者要素到位，五人团完成；闭锁空间设定通过古泉之口正式登场。",
    visibility: "sos_internal",
  },
  {
    id: "first_brigade_activity",
    title: "第一次 SOS 团活动 · 市内寻找神秘",
    date: {
      iso: "2002-06-15",
      relative: "高一春 · 五人到齐后的周末",
      precise: false,
    },
    volume: 1,
    scope: "medium",
    importance: "flavor",
    summary:
      "春日把五人分成两组，在车站集合后到市内随机搜索神秘现象，由抽签决定搭档，输的一方请客。这是 SOS 团第一次正式外勤活动。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树"],
    location: "北高最寄车站 → 市内街区",
    narrativeFunction: "建立团活动惯例（抽签、罚款、咖啡店）；阿虚与古泉、朝比奈分别有独处对话推进设定揭露。",
    visibility: "sos_internal",
  },
  {
    id: "asakura_attack",
    title: "朝仓凉子袭击事件 · 长门救阿虚",
    date: {
      iso: "2002-06-22",
      relative: "高一春 · 五人团成立后某放学日",
      precise: false,
    },
    volume: 1,
    scope: "large",
    importance: "main_line",
    summary:
      "班长朝仓凉子放学后把阿虚单独留下，自曝是情报统合思念体激进派接口，要杀死阿虚以观测春日反应。长门赶到与朝仓在被改写的空间内对决，最终成功删除朝仓。次日以「转学加拿大」掩盖。",
    participants: ["阿虚", "朝仓凉子", "长门有希"],
    location: "北高一年五班教室（被资讯操作改写的空间）",
    narrativeFunction: "主线决定性升级：阿虚亲眼确认长门=外星人是真的，世界观从「有趣传闻」切到「真的会死」。",
    visibility: "supernatural",
  },
  {
    id: "first_closed_space",
    title: "第一次进入闭锁空间 · 神人破坏",
    date: {
      iso: "2002-06-25",
      relative: "高一春 · 朝仓事件后不久的某个夜晚",
      precise: false,
    },
    volume: 1,
    scope: "large",
    importance: "main_line",
    summary:
      "古泉首次带阿虚乘出租车进入由春日烦躁情绪生成的闭锁空间，亲眼见识灰色天空下「神人」蓝色巨人砸毁建筑物，由古泉与机关同伴变身红色光球将其击破。",
    participants: ["阿虚", "古泉一树", "神人"],
    location: "闭锁空间（市区投影）",
    narrativeFunction: "超能力者线、闭锁空间设定的眼见为实；阿虚理解「让春日不无聊=世界存亡级任务」。",
    visibility: "supernatural",
    chainId: "closed_space",
  },
  {
    id: "three_days_world_remake",
    title: "三天结局 · 春日无意识重塑世界",
    date: {
      iso: "2002-06-28",
      relative: "高一春末 · 第一次闭锁空间后连续三天（约 2002-06 末 ~ 2002-07 初）",
      precise: false,
    },
    volume: 1,
    scope: "large",
    importance: "main_line",
    summary:
      "春日陷入深度无聊与不安，巨型闭锁空间扩张吞噬现实，按古泉判断如不阻止三天内整个世界将被春日下意识重塑。阿虚被卷入新世界，醒来时身边只有春日在沉睡的旧教室。",
    participants: ["凉宫春日", "阿虚", "古泉一树", "长门有希", "朝比奈实玖瑠"],
    location: "逐渐扩张的闭锁空间 / 被重塑中的北高",
    narrativeFunction: "卷一终局危机：「让春日开心」从抽象任务变成倒计时的世界保卫战。",
    visibility: "supernatural",
    chainId: "vol1_climax",
  },
  {
    id: "kyon_kisses_haruhi",
    title: "阿虚之吻 · 把春日拉回旧世界",
    date: {
      iso: "2002-06-30",
      relative: "高一春末 · 三天结局最后夜",
      precise: false,
    },
    volume: 1,
    scope: "large",
    importance: "main_line",
    summary:
      "阿虚根据长门以电脑屏幕「Sleeping Beauty」留下的提示，在闭锁空间内告诉春日他喜欢她马尾的样子，并吻了她。世界回到原状，醒来后春日以为是梦，第二天扎着马尾上学。",
    participants: ["凉宫春日", "阿虚"],
    location: "被重塑的北高校园 → 现实",
    narrativeFunction: "卷一高潮与解决：阿虚-春日关系核心定锚（吻+马尾），世界存续，进入卷二日常基线。",
    visibility: "supernatural",
    chainId: "vol1_climax",
  },

  // ============================================================
  // 卷 3 短篇 ①：凉宫春日的烦闷（棒球大会）
  // 时间：高一 2002-07 初（vol 1 climax 收束后第一个 vol 3 短篇）
  // ============================================================
  {
    id: "baseball_tournament",
    title: "棒球大会",
    date: {
      iso: "2002-07-06",
      relative: "高一 · 7 月初的星期六（vol 1 climax 收束后的第一个 vol 3 短篇）",
      precise: false,
    },
    volume: 3,
    scope: "medium",
    importance: "flavor",
    summary:
      "春日心血来潮报名地区棒球大会，SOS 团临时凑队，加入鹤屋学姐、阿虚妹妹、谷口与国木田凑齐九人。首战对手是当地成人业余棒球队，春日靠长门暗中微调球棒让对方击球失灵反败为胜。",
    participants: [
      "凉宫春日",
      "阿虚",
      "长门有希",
      "朝比奈实玖瑠",
      "古泉一树",
      "鹤屋学姐",
      "阿虚的妹妹",
      "谷口",
      "国木田",
    ],
    location: "市民棒球场",
    narrativeFunction: "首次以「团体」身份对外活动，并首次大规模动用长门超能力解决日常麻烦。",
    visibility: "sos_internal",
    chainId: "baseball",
  },

  // ============================================================
  // 卷 3 短篇 ②：七夕狂想曲
  // 时间：高一 2002-07-07（present）+ 1999-07-07（past，三年前）
  // ============================================================
  {
    id: "tanabata_present",
    title: "七夕 · 朝比奈带阿虚穿越",
    date: { iso: "2002-07-07", precise: true },
    volume: 3,
    scope: "medium",
    importance: "main_line",
    summary:
      "春日召集 SOS 团举办七夕短册活动后，朝比奈实玖瑠突然请求阿虚一同回到三年前同一天，需要阿虚去做一件「一定要做」的事。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树"],
    location: "北高文艺部部室 / 朝比奈公寓",
    narrativeFunction: "启动「约翰·史密斯」因果闭环；为阿虚与春日初识那一刻提供前置原因。",
    visibility: "supernatural",
  },
  {
    id: "tanabata_past_john_smith",
    title: "约翰·史密斯之夜（三年前七夕）",
    date: {
      iso: "2002-07-07",
      relative: "玩家体验=2002-07-07 七夕夜穿越；事件本质上发生于 1999-07-07（春日中一时期）",
      precise: true,
    },
    volume: 3,
    scope: "large",
    importance: "main_line",
    summary:
      "阿虚与朝比奈穿越到三年前的七夕夜，溜进东中操场，帮当时还在初一的春日用石灰画下巨型符号（长门事后说意为「我在这里」）。阿虚化名「约翰·史密斯」，奠定春日对阿虚的潜在记忆。",
    participants: [
      "阿虚（化名约翰·史密斯）",
      "朝比奈实玖瑠",
      "年少的凉宫春日（中一）",
      "长门有希（三年前的版本）",
    ],
    location: "东国中操场 / 三年前长门公寓",
    narrativeFunction: "封闭过去-现在因果环；解释长门为何会留意春日及 SOS 团的形成根源；为后续《消失》《惊愕》提供因。",
    visibility: "supernatural",
  },

  // ============================================================
  // 卷 3 短篇 ③：神秘信号
  // 时间：高一 2002-07 中旬（七夕之后）
  // ============================================================
  {
    id: "mysterique_sign_request",
    title: "喜绿江美里委托寻找电研社社长",
    date: {
      iso: "2002-07-13",
      relative: "高一 · 7 月中旬周末（七夕之后）",
      precise: false,
    },
    volume: 3,
    scope: "small",
    importance: "flavor",
    summary:
      "二年级学姐喜绿江美里以电研社社长女友身份找上 SOS 团，委托寻找失踪的男友。这是 SOS 团对外公开后接的第一位客人。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树", "喜绿江美里"],
    location: "北高文艺部部室",
    narrativeFunction: "引入喜绿江美里这一关键情报统合思念体终端伏笔；启动 SOS 团对外接案模式。",
    visibility: "sos_internal",
  },
  {
    id: "mysterique_sign_resolution",
    title: "神秘信号 · 闭锁空间击退情报生命体",
    date: {
      iso: "2002-07-14",
      relative: "高一 · 神秘信号事件次日",
      precise: false,
    },
    volume: 3,
    scope: "medium",
    importance: "flavor",
    summary:
      "长门带阿虚、朝比奈、古泉进入分离的资讯空间，发现被巨型洞穴蟋蟀状情报生命体困住的电研社社长，由长门与古泉合力击退，社长获救。",
    participants: ["阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树", "电研社社长", "喜绿江美里"],
    location: "分离的资讯空间 / 电研社社长公寓",
    narrativeFunction: "展示长门作为情报生命体终端的战斗能力，加深 SOS 团成员对各自身份的认知。",
    visibility: "supernatural",
  },

  // ============================================================
  // 卷 3 短篇 ④：孤岛症候群
  // 时间：高一暑假首日 2002-07-21 ~ 2002-07-23
  // ============================================================
  {
    id: "island_departure",
    title: "孤岛症候群 · SOS 团出发前往多丸家别墅",
    date: {
      iso: "2002-07-21",
      relative: "高一暑假首日（结业式翌日）",
      precise: false,
    },
    volume: 3,
    scope: "small",
    importance: "main_line",
    summary:
      "古泉的远房亲戚多丸圭一邀请 SOS 团到濑户内海私人小岛上的别墅度假 4 天 3 夜，与圭一之弟多丸裕同住，包含管家森园生美与女佣新川等人。",
    participants: [
      "凉宫春日",
      "阿虚",
      "长门有希",
      "朝比奈实玖瑠",
      "古泉一树",
      "多丸圭一",
      "多丸裕",
      "森园生美",
      "新川",
    ],
    location: "濑户内海多丸家私人岛屿别墅",
    narrativeFunction: "开启「封闭环境本格推理」模式，铺陈古泉一方对春日精神状态的管理手段。",
    visibility: "sos_internal",
    chainId: "summer_island",
  },
  {
    id: "island_murder_mystery",
    title: "孤岛症候群 · 台风夜「杀人事件」",
    date: {
      iso: "2002-07-23",
      relative: "孤岛旅程第三天清晨 · 台风过境次日",
      precise: false,
    },
    volume: 3,
    scope: "large",
    importance: "main_line",
    summary:
      "台风夜后，多丸圭一被发现「死」在锁着的房间内，胸口插刀。春日兴奋以名侦探自居展开调查，最终阿虚识破整起命案是圭一与裕、佣人合谋为取悦春日设的剧本。",
    participants: [
      "凉宫春日",
      "阿虚",
      "长门有希",
      "朝比奈实玖瑠",
      "古泉一树",
      "多丸圭一",
      "多丸裕",
      "森园生美",
      "新川",
    ],
    location: "多丸家孤岛别墅",
    narrativeFunction: "古泉一方主动制造「事件」以填充春日好奇心、避免她无聊到引发更大异变——「机关」运作模式的关键展示。",
    visibility: "sos_internal",
    chainId: "summer_island",
  },

  // ============================================================
  // 卷 2：凉宫春日的叹息（拍电影）
  // 时间：高一秋 2002-10 ~ 2002-11（文化祭周）
  // ============================================================
  {
    id: "haruhi_announces_movie_plan",
    title: "春日宣布拍电影参加文化祭",
    date: {
      iso: "2002-10-18",
      relative: "高一秋 · 10 月中旬（文化祭约一个月前）",
      precise: false,
    },
    volume: 2,
    scope: "small",
    importance: "main_line",
    summary:
      "春日在 SOS 团室宣布看了一部得奖电影后大失所望，决定 SOS 团要为即将到来的北高文化祭拍一部自制电影来扩大知名度。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树"],
    location: "北高文艺部部室",
    narrativeFunction: "卷 2 主线启动事件——电影企划由此成立，所有后续设定外溢都源自这一刻春日把虚构当真。",
    visibility: "sos_internal",
  },
  {
    id: "movie_role_casting",
    title: "春日决定剧本与演员分配",
    date: {
      iso: "2002-10-22",
      relative: "高一秋 · 10 月中旬（宣布拍电影后数日）",
      precise: false,
    },
    volume: 2,
    scope: "small",
    importance: "main_line",
    summary:
      "春日自任导演，分配朝比奈饰演来自未来的战斗女仆（女主角），古泉饰演超能力少年，长门饰演邪恶外星魔法师，阿虚被指派打杂兼摄像。剧名《朝比奈实玖瑠的冒险 Episode 00》。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树"],
    location: "北高 SOS 团活动室",
    narrativeFunction: "确立卷 2 核心剧中剧的人物设定，这些设定后来在现实中开始生效。",
    visibility: "sos_internal",
  },
  {
    id: "equipment_acquisition_and_commercials",
    title: "强抢店家赞助与拍摄商业广告",
    date: {
      iso: "2002-10-25",
      relative: "高一秋 · 10 月下旬（开拍首日）",
      precise: false,
    },
    volume: 2,
    scope: "small",
    importance: "flavor",
    summary:
      "春日带众人到商店街，从相机店、服装店、点心铺等强行换得设备、服装与道具，作为交换条件 SOS 团必须为各家店拍摄宣传广告。",
    participants: ["凉宫春日", "阿虚", "朝比奈实玖瑠", "长门有希", "古泉一树"],
    location: "车站前商店街",
    narrativeFunction: "建立电影制作的物质基础；展示春日「借势」行事的强势作风。",
    visibility: "public",
  },
  {
    id: "park_filming_shamisen_pickup",
    title: "公园外景拍摄 · 捡到三味线",
    date: {
      iso: "2002-10-26",
      relative: "高一秋 · 10 月下旬（首个周六）",
      precise: false,
    },
    volume: 2,
    scope: "medium",
    importance: "main_line",
    summary:
      "SOS 团在公园拍摄朝比奈与长门对决等多场戏。期间春日在公共泳池后巷捡来一只野生雄性三色猫充当道具，命名为「三味线」，此猫后来获得说话能力。",
    participants: ["凉宫春日", "阿虚", "朝比奈实玖瑠", "长门有希", "古泉一树", "三味线"],
    location: "市内公园 / 公共泳池附近",
    narrativeFunction: "三味线登场——是春日设定外溢的标志物之一，也是日后成为长期常驻角色的入团点。",
    visibility: "sos_internal",
  },
  {
    id: "mikuru_eye_beam_incident",
    title: "朝比奈「实玖瑠光波」真实射出",
    date: {
      iso: "2002-10-27",
      relative: "高一秋 · 10 月下旬（开拍后第二天前后）",
      precise: false,
    },
    volume: 2,
    scope: "medium",
    importance: "main_line",
    summary:
      "春日命朝比奈「从左眼射出光波」，朝比奈不慎真的射出激光，切断反光板并在长门右掌烫穿四个黑洞。长门事后向阿虚证实那束光是真实能量。",
    participants: ["凉宫春日", "朝比奈实玖瑠", "长门有希", "阿虚"],
    location: "外景拍摄现场",
    narrativeFunction: "整个系列首次被明确证明春日能让虚构变为现实——卷 2 乃至全系列的关键能力宣告。",
    visibility: "supernatural",
  },
  {
    id: "reality_distortions_escalate",
    title: "现实扭曲连锁加剧",
    date: {
      iso: "2002-10-30",
      relative: "高一秋 · 10 月底至 11 月初（拍摄中后段）",
      precise: false,
    },
    volume: 2,
    scope: "medium",
    importance: "main_line",
    summary:
      "白鸽变成早已绝种的旅鸽、秋季公园树上盛开樱花、摄像机里飞出成群麻雀、三味线开口讲话等异象接连出现。古泉警告阿虚事态危急。",
    participants: ["凉宫春日", "阿虚", "古泉一树", "长门有希", "朝比奈实玖瑠", "三味线"],
    location: "拍摄外景各处 / SOS 团活动室",
    narrativeFunction: "春日「无意识造世界」的力量从单点爆发升级为系统性失序，逼出全卷的中心冲突。",
    visibility: "supernatural",
  },
  {
    id: "koizumi_warning_closed_space",
    title: "古泉警告 · 闭锁空间善后",
    date: {
      iso: "2002-11-02",
      relative: "高一秋 · 11 月初（文化祭前一周）",
      precise: false,
    },
    volume: 2,
    scope: "medium",
    importance: "main_line",
    summary:
      "古泉向阿虚解释：若春日继续把电影内容当真，可能引发世界级灾难。机关在闭锁空间里持续应付神人化身的暴走，求阿虚务必让春日意识到电影只是虚构。",
    participants: ["古泉一树", "阿虚"],
    location: "回家路上 / SOS 团活动室",
    narrativeFunction: "把卷 2 推到危机临界点，明确接下来阿虚必须解决的任务。",
    visibility: "supernatural",
  },
  {
    id: "kyon_haruhi_confrontation",
    title: "阿虚怒斥春日 · 拍摄一度中断",
    date: {
      iso: "2002-11-05",
      relative: "高一秋 · 11 月初（文化祭前数日）",
      precise: false,
    },
    volume: 2,
    scope: "large",
    importance: "main_line",
    summary:
      "因春日不断为博噱头逼朝比奈做出过激镜头，阿虚在长门家中爆发对春日发火。冷战后两人和解，阿虚协助春日把电影写出像样的结局，并加录「本片纯属虚构」的声明。",
    participants: ["阿虚", "凉宫春日", "朝比奈实玖瑠", "长门有希"],
    location: "长门有希的公寓 / SOS 团活动室",
    narrativeFunction: "阿虚通过「虚构声明」让春日重新区分现实与电影，是化解卷 2 全部超自然外溢的关键转折。",
    visibility: "sos_internal",
  },
  {
    id: "movie_self_completes",
    title: "电影一夜之间神奇成片",
    date: {
      iso: "2002-11-08",
      relative: "高一秋 · 11 月初（文化祭前一夜）",
      precise: false,
    },
    volume: 2,
    scope: "small",
    importance: "main_line",
    summary:
      "阿虚和春日剪辑到深夜均未完成成片便睡去，但翌日发现电影已被某种力量补完所有特效与剪辑，按时赶上文化祭放映。",
    participants: ["凉宫春日", "阿虚"],
    location: "SOS 团活动室 / 春日家",
    narrativeFunction: "暗示长门或春日本人「补完」了影片——卷 2 收束设定外溢的最后一个超自然标记。",
    visibility: "supernatural",
  },
  {
    id: "cultural_festival_screening",
    title: "北高文化祭 ·《朝比奈实玖瑠的冒险 Episode 00》放映",
    date: {
      iso: "2002-11-09",
      relative: "高一秋 · 11 月初（文化日前后周末）",
      precise: false,
    },
    volume: 2,
    scope: "medium",
    importance: "main_line",
    summary:
      "在北高文化祭当日，SOS 团于校内会场放映这部自制电影。观众反应褒贬两极，但电影顺利上映，全部超自然异象随之归零。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树"],
    location: "北高校园 · 放映会场",
    narrativeFunction: "卷 2 终幕：现实回到秩序，电影成为系列内的「剧中作」，并为之后卷数事件埋下因果。",
    visibility: "public",
  },

  // ============================================================
  // 卷 4：凉宫春日的消失
  // 时间：2002-12（圣诞 + 消失日 + 时间循环回收）
  // ============================================================
  {
    id: "christmas_hotpot_planning",
    title: "SOS 团决定办圣诞火锅会",
    date: { iso: "2002-12-16", precise: true },
    volume: 4,
    scope: "small",
    importance: "main_line",
    summary:
      "凉宫春日召集 SOS 团决定圣诞夜在部室办火锅派对，要求朝比奈穿圣诞老人装，由春日掌勺，并要求阿虚邀请谷口与国木田参加。这是消失事件前世界尚正常的最后一次 SOS 团聚会。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树"],
    location: "北高文艺部部室",
    narrativeFunction: "建立消失事件前的「正常世界」基线，为读者制造对比落差；埋下 24 日火锅会作为故事终点的伏笔。",
    visibility: "sos_internal",
  },
  {
    id: "kyon_invites_taniguchi",
    title: "阿虚邀请谷口参加圣诞会",
    date: { iso: "2002-12-17", precise: true },
    volume: 4,
    scope: "small",
    importance: "flavor",
    summary:
      "阿虚向谷口与国木田发出火锅会邀请。谷口表示自己有光阳园学院女生的约会而拒绝。这一对话在消失日之后会被改写——改变后的谷口生病、否认有约会。",
    participants: ["阿虚", "谷口", "国木田"],
    location: "北高一年五班",
    narrativeFunction: "为消失日后的对照提供锚点：同一谷口在两个世界里的反应差异成为阿虚最早察觉异常的线索之一。",
    visibility: "public",
  },
  {
    id: "disappearance_day",
    title: "消失日 · 世界被改写",
    date: { iso: "2002-12-18", precise: true },
    volume: 4,
    scope: "large",
    importance: "main_line",
    summary:
      "阿虚到校发现世界被根本性改变：凉宫春日不在一年五班、古泉所在的一年九班整个班级不存在、朝比奈实玖瑠认不出他、朝仓凉子重新作为班长出现、长门有希变成戴眼镜的内向普通人类少女。",
    participants: ["阿虚", "长门有希", "朝比奈实玖瑠", "鹤屋学姐", "朝仓凉子", "谷口"],
    location: "北高一年五班、一年九班教室、文艺部部室",
    narrativeFunction: "整卷的核心转折与谜题起点；标题事件本身。让阿虚（与读者）面对「没有春日的日常世界」。",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    id: "bookmark_clue_found",
    title: "长门留下的书签线索",
    date: {
      iso: "2002-12-18",
      relative: "消失日傍晚至次日",
      precise: true,
    },
    volume: 4,
    scope: "medium",
    importance: "main_line",
    summary:
      "阿虚在改变后的长门借给他的书《超光速粒子》中发现一张写有信息的书签——这是「原」长门有希在被改写前留给阿虚的紧急回避程序提示，指向部室电脑里的应急程序。",
    participants: ["阿虚", "长门有希（改变后）"],
    location: "北高文艺部部室 / 阿虚家",
    narrativeFunction: "把阿虚从「被困」状态推向「反抗」状态：原长门给未来阿虚留下了选择权。",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    id: "yuki_house_visit",
    title: "拜访改变后的长门家",
    date: { iso: "2002-12-19", precise: true },
    volume: 4,
    scope: "large",
    importance: "main_line",
    summary:
      "阿虚再次找到改变后的长门，长门邀请他到自家公寓。两人交谈时朝仓凉子带宵夜来访，三人共进晚餐。阿虚在与「普通人长门」的接触中产生迷茫——这个温柔害羞的长门也很可爱。",
    participants: ["阿虚", "长门有希（改变后）", "朝仓凉子（改变后）"],
    location: "长门有希的公寓",
    narrativeFunction: "为阿虚最终选择埋下最大的情感分量——让他真切体会到「放弃原世界、留在普通世界」是有诱惑力的选项。",
    visibility: "sos_internal",
    chainId: "disappearance",
  },
  {
    id: "find_haruhi_kouyouen",
    title: "在光阳园学院找到春日",
    date: { iso: "2002-12-20", precise: true },
    volume: 4,
    scope: "large",
    importance: "main_line",
    summary:
      "阿虚得知春日在光阳园学院（此世界已男女合校）就读。阿虚前往光阳园找到春日与古泉。一开始春日完全不认识他，阿虚利用「约翰·史密斯」这个名字让她相信自己。最终把 SOS 团成员全部召集到部室。",
    participants: ["阿虚", "凉宫春日", "古泉一树", "朝比奈实玖瑠", "长门有希（改变后）", "谷口"],
    location: "光阳园学院 / 北高文艺部部室",
    narrativeFunction: "把卷 3《七夕狂想曲》的「约翰·史密斯」伏笔正式回收——正是过去的留言救了未来的世界。",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    id: "activate_emergency_program",
    title: "启动长门的紧急回避程序",
    date: {
      iso: "2002-12-20",
      relative: "12 月 20 日深夜",
      precise: true,
    },
    volume: 4,
    scope: "medium",
    importance: "main_line",
    summary:
      "阿虚按书签线索操作部室电脑，激活原长门留下的紧急回避程序。程序要求他选择回到「造成此次改变的关键时点」——把阿虚连同改变后的春日、朝比奈、古泉一起送往三年前的七夕。",
    participants: ["阿虚", "凉宫春日", "朝比奈实玖瑠", "古泉一树"],
    location: "北高文艺部部室",
    narrativeFunction: "故事从「解谜」阶段进入「修正」阶段；把卷 3 的时间环路接回卷 4。",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    id: "tanabata_three_years_ago",
    title: "（消失事件中）回到三年前的七夕",
    date: {
      iso: "2002-12-20",
      relative: "玩家体验=2002-12-20 紧急程序启动；事件本质上发生于 1999-07-07（与卷 3 七夕同时点）",
      precise: true,
    },
    volume: 4,
    scope: "medium",
    importance: "main_line",
    summary:
      "阿虚被送回三年前的七夕，与长大的朝比奈实玖瑠（大）会合，去找三年前的长门有希请求帮助。三年前的长门以数据同步方式确认未来情况，并把「修正用程序」交给阿虚。",
    participants: [
      "阿虚",
      "朝比奈实玖瑠（大）",
      "长门有希（三年前）",
      "凉宫春日（中一，间接）",
    ],
    location: "三年前的北高校园 / 长门家",
    narrativeFunction: "完成时间环路的关键节点：揭示七夕短篇里阿虚的留言其实是为消失事件服务的；把「约翰·史密斯」之名变成救世密码。",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    id: "kyon_meets_past_self",
    title: "阿虚与过去的自己擦身",
    date: {
      iso: "2002-12-20",
      relative: "玩家体验=2002-12-20 时间循环；事件本质上发生于 1999-07-07 同夜",
      precise: true,
    },
    volume: 4,
    scope: "small",
    importance: "main_line",
    summary:
      "在三年前的七夕，阿虚与卷 3 里那个版本的「过去阿虚」（正陪小春日画地上符号的自己）擦身而过——这是卷 3 结尾「阿虚被某人敲晕送回现在」之谜的回答：敲晕他的就是来自卷 4 的现在自己。",
    participants: ["阿虚（消失卷）", "阿虚（七夕卷的过去版）", "朝比奈实玖瑠（大）"],
    location: "三年前的北高校园",
    narrativeFunction: "对卷 3 悬念给出答案，证明系列的时间因果是闭合环。",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    id: "return_to_disappearance_dawn",
    title: "返回消失日凌晨",
    date: {
      iso: "2002-12-20",
      relative: "玩家体验=2002-12-20 时间循环回程；事件本质上发生于 2002-12-18 凌晨（消失正在发生的瞬间）",
      precise: true,
    },
    volume: 4,
    scope: "large",
    importance: "main_line",
    summary:
      "阿虚带着修正程序返回消失日凌晨——正是「原长门」借春日之力改写世界的临界点。改变后的长门已经把世界封锁完毕，但她特意把最终选择权留给了阿虚：是注射程序恢复原世界，还是什么都不做、留在没有非日常的平稳世界。",
    participants: ["阿虚", "长门有希（执行改写者）"],
    location: "消失日凌晨的北高文艺部部室",
    narrativeFunction: "把整卷主题——「阿虚到底想要哪种生活」——逼到决断面前。系列核心问题的正面回答场景。",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    id: "kyon_chooses_and_stabbed",
    title: "阿虚的选择与朝仓凉子刺伤",
    date: {
      iso: "2002-12-20",
      relative: "玩家体验=2002-12-20 时间循环高潮；事件本质上发生于 2002-12-18 凌晨",
      precise: true,
    },
    volume: 4,
    scope: "large",
    importance: "main_line",
    summary:
      "阿虚在天台上独白后做出选择：他要回到春日的那个非日常世界。正当他要把修正程序注入改变后的长门时，朝仓凉子突然出现并将他刺伤。千钧一发之际，未来的长门、未来的朝比奈与未来的阿虚自己赶到救援，未来的自己开枪击中改写者长门，使长门被修正、世界回到原状。",
    participants: [
      "阿虚",
      "长门有希",
      "朝仓凉子",
      "未来的阿虚",
      "未来的朝比奈实玖瑠",
      "未来的长门有希",
    ],
    location: "北高文艺部部室",
    narrativeFunction: "凉宫系列最重要的角色转折之一：阿虚第一次主动声明「我选择春日的世界」；同时揭示长门情感故障的根本原因。",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    id: "kyon_wakes_hospital",
    title: "阿虚在医院苏醒",
    date: { iso: "2002-12-21", precise: true },
    volume: 4,
    scope: "medium",
    importance: "main_line",
    summary:
      "阿虚在医院病床上醒来，世界已恢复原样。对外的官方解释是他在 18 日早晨从楼梯摔下昏迷至今。春日、长门、朝比奈、古泉、谷口、国木田、妹妹陆续探望。长门因负担过载住进同一家医院。",
    participants: ["阿虚", "凉宫春日", "长门有希", "朝比奈实玖瑠", "古泉一树", "阿虚的妹妹"],
    location: "医院病房",
    narrativeFunction: "为阿虚提供消化整起事件的喘息空间，确认所有人回归原状；安排长门住院让阿虚去主动看望，深化两人关系。",
    visibility: "public",
  },
  {
    id: "rooftop_with_yuki",
    title: "医院天台与长门独处",
    date: {
      iso: "2002-12-22",
      relative: "出院前后，与长门在医院天台单独会面",
      precise: false,
    },
    volume: 4,
    scope: "medium",
    importance: "main_line",
    summary:
      "阿虚在医院天台与长门有希单独相会。长门承认自己曾起心动念改写世界、并向阿虚道歉。阿虚以微笑回应，确认自己不会因此疏远她。",
    participants: ["阿虚", "长门有希"],
    location: "医院天台",
    narrativeFunction: "把整卷的情感主线（长门的「心」）落到一次面对面的和解上，奠定后续卷数中长门人物弧线的基础。",
    visibility: "sos_internal",
  },
  {
    id: "christmas_eve_hotpot",
    title: "SOS 团圣诞火锅会",
    date: { iso: "2002-12-24", precise: true },
    volume: 4,
    scope: "medium",
    importance: "main_line",
    summary:
      "12 月 16 日提议的圣诞火锅会如期在文艺部部室召开：朝比奈穿圣诞老人装、春日掌勺、长门读书、古泉调侃、阿虚被使唤——一切「非日常的日常」都回来了。这是阿虚亲手选择回来的世界。",
    participants: ["凉宫春日", "阿虚", "长门有希", "朝比奈实玖瑠", "古泉一树"],
    location: "北高文艺部部室",
    narrativeFunction: "整卷的情感落点：阿虚的选择以最朴素的「大家一起吃火锅」作答，呼应卷首的策划，闭合主线。",
    visibility: "sos_internal",
  },
];

// ============================================================
// 查询助手
// ============================================================

const ONE_DAY = 24 * 60 * 60 * 1000;

/** 返回某 ISO 日期当天发生的所有事件（多事件同日时按数组顺序） */
export function getCanonEventsOnDate(iso: string): CanonEvent[] {
  return canonTimeline.filter((e) => e.date.iso === iso);
}

/**
 * 返回当前应"已经发生"但游戏里还没触发过的 main_line 事件。
 * 用于：state.date 跨过 canon date → 强制下一批 prompt 把该事件作为本轮焦点。
 * 结果按 ISO 日期升序排列——保证多个 pending 事件按原作时间顺序依次触发。
 *
 * @param currentIso 当前 in-game 日期
 * @param triggeredIds 已触发过的事件 id 集合
 */
export function getMainLinePendingTriggers(
  currentIso: string,
  triggeredIds: Set<string>,
): CanonEvent[] {
  const cur = new Date(currentIso).getTime();
  if (Number.isNaN(cur)) return [];
  return canonTimeline
    .filter((e) => {
      if (e.importance !== "main_line") return false;
      if (triggeredIds.has(e.id)) return false;
      const t = new Date(e.date.iso).getTime();
      return t <= cur;
    })
    .sort((a, b) => a.date.iso.localeCompare(b.date.iso));
}

/**
 * 起点初始化用：返回所有日期严格早于 startingIso 的 canon event id。
 * 这些事件在选择该起点时被视为"已发生过"，不会再被强制触发。
 */
export function preTriggeredEventIdsAsOf(startingIso: string): string[] {
  const cur = new Date(startingIso).getTime();
  if (Number.isNaN(cur)) return [];
  return canonTimeline
    .filter((e) => new Date(e.date.iso).getTime() < cur)
    .map((e) => e.id);
}

/** 时间窗口（前后 14 天 + 当天） */
export type TimelineWindow = {
  recent: CanonEvent[];
  upcoming: CanonEvent[];
  ongoing: CanonEvent[];
};

export function getCanonTimelineWindow(currentIso: string): TimelineWindow {
  const now = new Date(currentIso);
  if (Number.isNaN(now.getTime())) return { recent: [], upcoming: [], ongoing: [] };

  const recent: CanonEvent[] = [];
  const upcoming: CanonEvent[] = [];
  const ongoing: CanonEvent[] = [];

  for (const e of canonTimeline) {
    const t = new Date(e.date.iso).getTime();
    const diffDays = (t - now.getTime()) / ONE_DAY;
    if (Math.abs(diffDays) < 1) ongoing.push(e);
    else if (diffDays < 0 && diffDays > -14) recent.push(e);
    else if (diffDays > 0 && diffDays < 14) upcoming.push(e);
  }
  return { recent, upcoming, ongoing };
}

// ============================================================
// Prompt 注入辅助
// ============================================================

/**
 * 按玩家身份过滤事件可见性：
 *   public：所有人都能感知
 *   sos_internal：fringe / core / anomaly / observer 才能近距离观察
 *   supernatural：所有身份都注入，但 LLM 应当用「奇怪 / 不对劲」而非术语命名（路人玩家无法识别其超自然本质）
 */
function visibilityForIdentity(identity: string, vis: CanonEvent["visibility"]): boolean {
  if (vis === "public") return true;
  if (vis === "sos_internal") return ["fringe", "core", "anomaly", "observer"].includes(identity);
  return true;
}

/** 给 prompt 用：返回基于身份过滤的当前时间窗口 */
export function getTimelineContext(currentIso: string, identity: string): TimelineWindow {
  const win = getCanonTimelineWindow(currentIso);
  const filter = (e: CanonEvent) => visibilityForIdentity(identity, e.visibility);
  return {
    recent: win.recent.filter(filter),
    upcoming: win.upcoming.filter(filter),
    ongoing: win.ongoing.filter(filter),
  };
}

/** 把当前时间窗口渲染成 prompt 注入文本 */
export function renderTimelineContext(opts: { currentIso: string; identity: string }): string {
  const { recent, upcoming, ongoing } = getTimelineContext(opts.currentIso, opts.identity);
  const lines: string[] = [];
  lines.push("【SOS 团世界事件时间表 · 当前时间窗口】");
  lines.push("（这是凉宫春日等人在世界里按时间发生的事——玩家以原创角色身份按身份程度观察 / 参与 / 卷入）");
  lines.push("");
  if (ongoing.length > 0) {
    lines.push("[今天发生]");
    ongoing.forEach((e) => lines.push(`· ${e.date.iso} ${e.title}：${e.summary}`));
  }
  if (recent.length > 0) {
    lines.push("[最近 14 天已发生]");
    recent.forEach((e) => lines.push(`· ${e.date.iso} ${e.title}：${e.summary}`));
  }
  if (upcoming.length > 0) {
    lines.push("[未来 14 天即将发生（不要剧透，但可铺垫氛围）]");
    upcoming.forEach((e) => lines.push(`· ${e.date.iso} ${e.title}（不在本轮直接发生）`));
  }
  if (ongoing.length === 0 && recent.length === 0 && upcoming.length === 0) {
    lines.push("（最近无主线事件——背景里 SOS 团仍在运转，但本期没有节点级事件）");
  }
  return lines.join("\n");
}
