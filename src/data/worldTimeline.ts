// 世界事件时间表（World Event Timeline）
//
// 这是凉宫春日系列原作主线在游戏世界里"按时间发生"的事件清单。
// 它**不是玩家的剧情大纲**——是 SOS 团那帮人的真实生活节奏。
// 玩家以原创角色身份按身份的不同程度从外部参与/旁观/卷入。
//
// promptRouter 每轮按 state.date 切出"前后窗口"注入，让 LLM 知道：
//   · 最近发生过什么（玩家可能听到 / 看到 / 卷入）
//   · 即将发生什么（不要剧透但可以铺垫）

export type WorldEvent = {
  /** ISO 日期（精度日级或月级，可写 "2002-04-08" 或 "2002-05-10" 等） */
  date: string;
  title: string;
  /** 事件描述：发生了什么、谁参与 */
  description: string;
  /** 哪些身份的玩家原则上能感知这件事
   *  - public：所有玩家都能听到/看到（如"听到一年五班传来奇怪的自我介绍"）
   *  - sos_internal：只有 fringe/core 才能近距离观察
   *  - supernatural：只有 anomaly/observer 才能识别其异常本质
   */
  visibility: "public" | "sos_internal" | "supernatural";
  /** 事件链 id（如有，玩家深度卷入时可触发该链） */
  chainId?: string;
};

// 高一一年的关键世界事件（按原作主线整理）
export const worldTimeline: WorldEvent[] = [
  {
    date: "2002-04-08",
    title: "入学典礼 · 凉宫春日的自我介绍宣言",
    description:
      "一年五班教室。凉宫春日做了那段震惊全班的自我介绍：'对普通的人类没有兴趣！" +
      "如果你们之中有外星人、未来人、异世界人、超能力者的话，就直接来找我吧！'" +
      "全班死寂。她坐回阿虚正后方（座位表分配）。",
    visibility: "public",
  },
  {
    date: "2002-04-15",
    title: "春日开始系统性考察社团",
    description:
      "之后约一周。凉宫春日依次去运动部、文艺部、各种研究会，每个都嫌弃。" +
      "全校学生开始议论这个'怪人一年级女生'。",
    visibility: "public",
  },
  {
    date: "2002-04-25",
    title: "春日在课堂上明显走神 · 每天换发型",
    description:
      "她在初中三年里换过五次发型——现在到了北高，又开始了。" +
      "全校都在私下议论。",
    visibility: "public",
  },
  {
    date: "2002-05-02",
    title: "春日宣布'我自己建社团'",
    description:
      "某天放学后，春日突然冲到阿虚面前，宣布：'既然没有合适的社团，我自己建一个！'",
    visibility: "public",
  },
  {
    date: "2002-05-09",
    title: "强占文艺部部室 · 第一次见到长门",
    description:
      "春日把目光锁在了文艺部部室——'反正只剩一个人'。她拽着阿虚推开旧馆三楼最里侧的门。" +
      "长门有希在那里。从这天起，文艺部部室成了 SOS 团的活动地点。",
    visibility: "sos_internal",
  },
  {
    date: "2002-05-16",
    title: "电研社事件 · SOS 团第一台电脑",
    description:
      "春日带着阿虚和路过被拽来的朝比奈实玖瑠冲到电研社，演了一出'非礼现场'，" +
      "讹来一台电脑。SOS 团此后正式成立。",
    visibility: "sos_internal",
  },
  {
    date: "2002-05-23",
    title: "朝比奈实玖瑠正式被拽入 SOS 团",
    description:
      "春日'因为可爱'决定让二年级的朝比奈学姐成为团员。" +
      "朝比奈泪眼汪汪被按在沙发上换 cosplay 服装。",
    visibility: "sos_internal",
  },
  {
    date: "2002-06-03",
    title: "古泉一树转入北高一年九班 · 加入 SOS 团",
    description:
      "笑容标准化的转学生古泉一树转入。春日当场决定他也是团员。",
    visibility: "sos_internal",
  },
  {
    date: "2002-06-15",
    title: "SOS 团第一次正式活动 · 寻找不可思议",
    description:
      "周六上午车站前集合，分组寻找'不可思议'。迟到者请客。",
    visibility: "sos_internal",
  },
  {
    date: "2002-06-22",
    title: "朝仓凉子事件",
    description:
      "朝仓凉子（一年五班委员长，思念体激进派接口）试图杀阿虚以观测春日反应——" +
      "被长门有希当场删除。普通学生只知道朝仓'转学'去了加拿大。",
    visibility: "supernatural",
  },
  {
    date: "2002-07-05",
    title: "期末考试 · 春日的烦躁",
    description:
      "考试期间春日明显烦躁，她最讨厌'被规则绑住的几天'。文艺部部室的活动暂停。",
    visibility: "public",
  },
  {
    date: "2002-07-15",
    title: "拍摄《朝比奈实玖瑠的冒险 episode 00》",
    description:
      "暑假来临前，春日宣布拍摄一部 SOS 团原创电影。" +
      "她'随手设定'的剧情中：朝比奈是战斗女仆未来人、长门是邪恶魔法师、古泉是反派。" +
      "拍摄过程中，春日的'剧情设定'开始在现实中产生效果（这部分仅 supernatural 可见）。",
    visibility: "sos_internal",
  },
  {
    date: "2002-07-25",
    title: "棒球大会",
    description:
      "春日临时报名了一场业余棒球比赛。SOS 团 + 谷口、国木田、鹤屋凑齐九人。" +
      "决胜局长门'微调'弹道——这一幕被仔细看的人会发现不对劲。",
    visibility: "sos_internal",
    chainId: "baseball",
  },
  {
    date: "2002-07-30",
    title: "暑假开始 · 春日满足度走低 · 第一次闭锁空间",
    description:
      "胜利后的虚无几天。春日的满足度走低，城市某处可能切出闭锁空间。" +
      "古泉以光人形出现处理。",
    visibility: "supernatural",
    chainId: "closed_space",
  },
  {
    date: "2002-08-17",
    title: "孤岛事件 · 多丸氏家族",
    description:
      "古泉的远房亲戚多丸氏邀请 SOS 团到孤岛别墅。台风夜出现'尸体'——" +
      "实情是古泉与多丸氏合谋的本格推理剧本。",
    visibility: "sos_internal",
    chainId: "summer_island",
  },
  {
    date: "2002-08-25",
    title: "漫无止境的八月",
    description:
      "暑假最后两周。春日因'好像还没玩够'的潜意识，将这段时间无意识地循环了 15498 次。" +
      "只有长门保留全部循环的记忆。",
    visibility: "supernatural",
    chainId: "endless_eight",
  },
  {
    date: "2002-09-02",
    title: "新学期开学 · 文化祭准备启动",
    description:
      "高一第二学期。春日开始策划文化祭。",
    visibility: "public",
  },
  {
    date: "2002-11-09",
    title: "文化祭",
    description:
      "SOS 团表演节目（古泉的合唱团 / 长门的吉他演奏 / 春日临时拉来的诡异组合）。",
    visibility: "public",
  },
  {
    date: "2002-12-18",
    title: "消失事件",
    description:
      "12 月 18 日清晨。长门有希因长期观测中产生情感而出现故障，擅自篡改了世界——" +
      "把所有'异常'抹平、让春日成为普通人。" +
      "（仅 anomaly/observer 玩家可能直接观测；普通玩家只会觉得身边某些人'不对劲'。）",
    visibility: "supernatural",
    chainId: "disappearance",
  },
  {
    date: "2003-02-10",
    title: "高一寒假末尾 · 学期结束",
    description: "高一年度即将结束。考试氛围浓厚。",
    visibility: "public",
  },
];

// ---- 切窗口给 prompt ----

const ONE_DAY = 24 * 60 * 60 * 1000;

export type TimelineWindow = {
  recent: WorldEvent[];   // 最近 14 天内已发生
  upcoming: WorldEvent[]; // 未来 14 天内即将发生
  ongoing: WorldEvent[];  // 当天发生
};

export function getTimelineContext(currentIso: string, identity: string): TimelineWindow {
  const now = new Date(currentIso);
  if (Number.isNaN(now.getTime())) return { recent: [], upcoming: [], ongoing: [] };

  const recent: WorldEvent[] = [];
  const upcoming: WorldEvent[] = [];
  const ongoing: WorldEvent[] = [];

  for (const e of worldTimeline) {
    if (!visibilityForIdentity(identity, e.visibility)) continue;
    const t = new Date(e.date).getTime();
    const diffDays = (t - now.getTime()) / ONE_DAY;
    if (Math.abs(diffDays) < 1) ongoing.push(e);
    else if (diffDays < 0 && diffDays > -14) recent.push(e);
    else if (diffDays > 0 && diffDays < 14) upcoming.push(e);
  }
  return { recent, upcoming, ongoing };
}

function visibilityForIdentity(identity: string, vis: WorldEvent["visibility"]): boolean {
  // public：所有人都看得见
  // sos_internal：fringe/core/anomaly/observer
  // supernatural：anomaly/observer 才能看见全貌（普通玩家会感知到不对劲，但无法命名）
  if (vis === "public") return true;
  if (vis === "sos_internal") return ["fringe", "core", "anomaly", "observer"].includes(identity);
  // supernatural：仍向其他身份注入，但 LLM 应当用"奇怪 / 不对劲"而非术语命名
  return true;
}

export function renderTimelineContext(opts: { currentIso: string; identity: string }): string {
  const { recent, upcoming, ongoing } = getTimelineContext(opts.currentIso, opts.identity);
  const lines: string[] = [];
  lines.push("【SOS 团世界事件时间表 · 当前时间窗口】");
  lines.push("（这是凉宫春日等人在世界里按时间发生的事——玩家以原创角色身份按身份程度观察/参与/卷入）");
  lines.push("");
  if (ongoing.length > 0) {
    lines.push("[今天发生]");
    ongoing.forEach((e) => lines.push(`· ${e.date} ${e.title}：${e.description}`));
  }
  if (recent.length > 0) {
    lines.push("[最近 14 天已发生]");
    recent.forEach((e) => lines.push(`· ${e.date} ${e.title}：${e.description}`));
  }
  if (upcoming.length > 0) {
    lines.push("[未来 14 天即将发生（不要剧透，但可铺垫氛围）]");
    upcoming.forEach((e) => lines.push(`· ${e.date} ${e.title}（不在本轮直接发生）`));
  }
  if (ongoing.length === 0 && recent.length === 0 && upcoming.length === 0) {
    lines.push("（最近无主线事件——背景里 SOS 团仍在运转，但本期没有节点级事件）");
  }
  return lines.join("\n");
}
