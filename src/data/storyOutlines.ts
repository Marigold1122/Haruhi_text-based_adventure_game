import type { StoryOutline } from "@/types/storyOutline";
import type { StartingPointId } from "@/types/worldState";

// 三个起点的剧情大纲——按原作主线编写。
// 每条大纲是一个节拍序列；LLM 必须沿着它走，节拍内可发挥细节，但不能跳节拍 / 改大方向。

const northHighEntranceOutline: StoryOutline = {
  startingPointId: "north_high_entrance",
  title: "凉宫春日的忧郁 · 北高入学日 → SOS 团成立",
  arc: [
    "原作《凉宫春日的忧郁》主线。",
    "从入学日凉宫春日的开场宣言开始，跟随阿虚视角看春日如何被周围的'平凡'惹恼，",
    "最终决定亲手创立 SOS 团，强行把长门、朝比奈、古泉拽进同一间部室。",
    "本主线在'第一次 SOS 团活动'结束。",
  ].join(""),
  beats: [
    {
      id: "intro_declaration",
      title: "入学日的宣言",
      summary: [
        "今天是入学北口高校的第一天。一年五班教室里，凉宫春日做了那段震惊全班的自我介绍：",
        "'对普通的人类没有兴趣！如果你们之中有外星人、未来人、异世界人、超能力者的话，就直接来找我吧！'",
        "教室一片死寂。她坐回阿虚正后方（座位表分配），全班的目光在阿虚身上停留得过久。",
        "本节拍最后给玩家一次选择：阿虚（或对应 POV）面对'要不要回头跟她说话'的瞬间。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "阿虚视角：是否回头与凉宫搭话；凉宫视角：是否注意到'阿虚'这个名字；其他视角：第一次目睹这场宣言的反应。",
      expectedSpan: "上午的两节课时间",
    },
    {
      id: "post_intro_days",
      title: "入学初期的零散日常",
      summary: [
        "宣言之后约一周。春日逐渐展示出她的怪异习惯：每天早上以不同发型出现、",
        "对老师的提问总是漫不经心、放学后立刻消失、对'普通'的同学一概忽略。",
        "阿虚（或 POV 角色）开始意识到自己被她钉在了某种位置上——前排座位、班委的协调对象、谷口起哄的对象。",
        "这一段用 summary 概括跨过约一周的零散日常，写出'被春日的怪异慢慢包围'的感觉。结尾不给选项，自然推进。",
      ].join("\n"),
      pace: "summary",
      requiresChoice: false,
      expectedSpan: "约一周",
    },
    {
      id: "first_real_talk",
      title: "第一次真正的对话",
      summary: [
        "课间休息或放学路上的某个具体瞬间——阿虚（或 POV 角色）第一次和凉宫春日有了一段真正意义上的对话。",
        "可能是关于她每天换发型的事，可能是关于她对班级活动的不耐烦，也可能是她突然冒出一句'你相信外星人吗？'。",
        "本节拍是 scene，要写清当下的细节、语气、对白节拍。最后给玩家选择如何回应这次对话。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "如何回应春日突然提出的话题：顺着她聊？敷衍？反问？保持距离？",
      expectedSpan: "约 10-20 分钟",
    },
    {
      id: "club_search",
      title: "春日寻找'有趣社团'失败",
      summary: [
        "之后约一周。春日开始系统性地考察校内所有社团，没有一个让她满意——",
        "运动部太正经、文艺部'只剩一个不说话的女生（长门）'、占卜研究会被她看不上。",
        "她每天放学后越来越烦躁。阿虚（或 POV）听到她在自言自语：'根本没有有趣的地方……'",
        "用 summary 跨过这一周的考察过程，结尾不给选项。",
      ].join("\n"),
      pace: "summary",
      requiresChoice: false,
      expectedSpan: "约一周",
    },
    {
      id: "decide_to_create",
      title: "春日宣布'要自己建社团'",
      summary: [
        "某一天放学后，春日突然冲到阿虚（或 POV）面前，宣布：'既然没有合适的社团，我自己建一个！'",
        "她的眼睛里有某种危险的兴奋。她要求 POV 角色当场表态——这是一个明确的'分岔节点'。",
        "本节拍是 scene，最后让玩家选择如何回应春日这个决定。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "面对春日突如其来的'我要建社团'：劝阻？随便嗯一声？反问需要做什么？提议先去找老师商量？",
      expectedSpan: "课间到放学后约 1 小时",
    },
    {
      id: "find_clubroom",
      title: "选定文艺部部室 · 第一次见到长门",
      summary: [
        "春日把目光锁在了文艺部部室——'反正只剩一个人，等于空着'。",
        "她拽着 POV 角色推开旧馆三楼最里侧的门。窗边的硬皮书被翻过一页。",
        "长门有希在那里。她合上书，没有任何表情地看着两个闯入者。",
        "这是 POV 与长门的第一次正式接触。本节拍 scene，结尾不给选项——",
        "由春日决定下一步（强行宣告'这里就是 SOS 团活动地点'），自然推进。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: false,
      expectedSpan: "约半小时",
    },
    {
      id: "computer_heist",
      title: "电研社事件 · 抢一台电脑",
      summary: [
        "春日决定 SOS 团需要一台电脑。她带着 POV 角色（必要时也带朝比奈）冲到电研社。",
        "她演了一出'电研社社长非礼朝比奈'的现场，反过来要求电研社赔偿一台电脑。",
        "电研社社长惊慌失措。本节拍最后让玩家选择如何收尾这场闹剧。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "阿虚出面调停的方式：替电研社讲情？默许春日讹电脑？想办法让双方都体面？",
      expectedSpan: "一个下午",
    },
    {
      id: "drag_asahina",
      title: "把朝比奈实玖瑠拽进团",
      summary: [
        "几天后。春日在校园某处看到朝比奈实玖瑠（二年级学姐），当场决定'这个我也要'。",
        "她不顾朝比奈的尖叫，把人拽到部室。朝比奈泪眼汪汪地被按在沙发上。",
        "POV 视角下：阿虚替朝比奈递茶；春日已经在翻 cosplay 服装的目录；长门在一旁看书。",
        "本节拍 scene，结尾不给选项。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: false,
      expectedSpan: "约一个下午",
    },
    {
      id: "koizumi_arrives",
      title: "古泉一树转入 · 第五位团员",
      summary: [
        "再过几天。一年九班来了一位转学生：古泉一树。标准化的笑容，五官端正。",
        "他在自我介绍时，目光不自然地多扫了一眼坐在阿虚身后的春日。",
        "春日当场决定'这个也要'，把他拽进 SOS 团。",
        "古泉对所有人都彬彬有礼，但 POV 角色（特别是阿虚）会感到一丝不对劲。",
        "本节拍 scene，最后让玩家选择如何对待古泉。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "面对这个笑容标准化的转学生：客气接纳？暗中打量？直接追问他为什么显得'不太对'？",
      expectedSpan: "上午到放学后",
    },
    {
      id: "first_activity",
      title: "SOS 团第一次正式活动",
      summary: [
        "全员集齐。春日在部室长桌前拍板：'SOS 团第一次正式活动——周六上午 9 点车站前集合，迟到的人请客！'",
        "周六到来。所有人按时到达（阿虚因为某种诡异巧合刚好踩点）。春日把大家分组，宣布去寻找'校园七大不可思议'。",
        "本节拍是 scene，最后让玩家选择 POV 角色在分组活动中的第一个具体行动。",
        "完成此节拍后，本主线告一段落（之后进入 SOS 团日常运转期）。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "SOS 团第一次活动里 POV 角色的第一步：跟谁一组？走向哪个方向？提议某个具体地点？",
      expectedSpan: "周六上午",
    },
  ],
};

const sosFoundedOutline: StoryOutline = {
  startingPointId: "sos_founded",
  title: "SOS 团成立后 → 第一次闭锁空间",
  arc: [
    "原作《凉宫春日的烦闷》中段主线。",
    "从 SOS 团创立周末开始，跟随团员日常 → 棒球大会 → 春日满足度低谷 → 第一次闭锁空间事件 → 古泉处理 → 春日恢复平稳。",
    "本主线以阿虚（或对应 POV）第一次理解'闭锁空间'的存在为终点。",
  ].join(""),
  beats: [
    {
      id: "club_routine",
      title: "部室里的日常运转",
      summary: [
        "电研社那台电脑还是新的；袖章墨迹未干。SOS 团进入'正在找东西做'的状态。",
        "春日提出过五六个调查方案：寻找鬼屋、跟踪不可思议人物、扫荡市中心商业街……每一个都半途而废。",
        "POV 视角下记录这一段日常：朝比奈泡茶、长门看书、古泉解说、阿虚被使唤跑腿。",
        "summary，跨过约一周。结尾不给选项。",
      ].join("\n"),
      pace: "summary",
      requiresChoice: false,
      expectedSpan: "约一周",
    },
    {
      id: "baseball_signup",
      title: "春日报名棒球大会",
      summary: [
        "某天放学后，春日推开部室门，把一张报名表'啪'拍在桌上：",
        "'我替我们报名了业余棒球大会，下周日比赛！'",
        "全员愣住——SOS 团只有 5 人，棒球需要 9 人。她已经把谷口、国木田、鹤屋拽来凑数。",
        "本节拍 scene，最后让玩家选择 POV 角色对此事的态度。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "面对春日的临时决定：劝她退报？接受现实？提议先练几天？",
      expectedSpan: "课后约半小时",
    },
    {
      id: "baseball_practice",
      title: "棒球练习的几天",
      summary: [
        "比赛前几天的练习。SOS 团成员各种水土不服：朝比奈接球总是失误、",
        "长门挥棒动作准得不像话但完全无表情、古泉投球姿势标准但球速堪忧、阿虚挥汗如雨。",
        "春日的训练强度令人崩溃。summary，跨过几天。结尾不给选项。",
      ].join("\n"),
      pace: "summary",
      requiresChoice: false,
      expectedSpan: "约 3-4 天",
    },
    {
      id: "baseball_match",
      title: "比赛日 · 长门的'微调'",
      summary: [
        "比赛当天。SOS 团一开始大幅落后。后半段，长门轻轻把眼镜往上一推——",
        "球的轨迹开始出现极不自然的微调：本应飞出场外的球忽然落在内野手套；",
        "对方投手的快球忽然慢了半拍；阿虚击出的球总是绕开守备。",
        "POV 视角下意识到这不正常。本节拍 scene，最后让玩家选择 POV 角色的反应。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "看到长门'微调'弹道时：当场质问？默认接受？事后悄悄找她？以为是巧合？",
      expectedSpan: "比赛下半场约 1 小时",
    },
    {
      id: "post_baseball_decline",
      title: "胜利后的虚无 · 春日满足度走低",
      summary: [
        "比赛胜利后春日开心了三天，第四天开始她又陷入了那种'什么都没意思'的烦躁。",
        "部室里的气氛变沉。古泉私下找 POV 角色递了一杯咖啡——若 POV 是核心成员，他会暗示'闭锁空间这几天可能再次出现'。",
        "summary 跨过这一段几天，结尾不给选项。",
      ].join("\n"),
      pace: "summary",
      requiresChoice: false,
      expectedSpan: "约一周",
    },
    {
      id: "closed_space_arrives",
      title: "闭锁空间出现",
      summary: [
        "某个放学后。POV 角色走在车站前广场——周遭的颜色突然被调低。",
        "声音消失。地面有不自然的弹性。远处楼宇之间，一道蓝色的轮廓正在缓慢站起来。",
        "若 POV 是身份允许的角色（fringe/core/anomaly/observer），世界书条目允许 POV 用'闭锁空间'/'神人'命名；否则只能描述感官的失真。",
        "本节拍是 scene，最后给玩家选择如何应对。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "面对眼前的失真世界：原地不动？尝试走向那道蓝色轮廓？呼喊有没有别人在？掏出手机？",
      expectedSpan: "约 10-15 分钟",
      enterChain: "closed_space",
    },
    {
      id: "koizumi_resolves",
      title: "古泉的处理",
      summary: [
        "古泉一树以发光人形的姿态出现在闭锁空间内——这是 POV 角色第一次见他用'机关'的能力。",
        "他平静地走向神人，开始处理。POV 在一旁观看——若身份允许，古泉会简短解释；否则 POV 只能看到光与轮廓。",
        "本节拍 scene。完成后闭锁空间收束、回到现实。结尾不给选项。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: false,
      expectedSpan: "约 30 分钟",
    },
    {
      id: "back_to_normal",
      title: "回到部室 · 一个看似平凡的下午",
      summary: [
        "事件结束后的第二天放学。部室一切如常：朝比奈泡茶、长门看书、春日在抱怨'最近都没有不可思议的事'。",
        "POV 视角下知道刚刚发生过什么——但全世界包括春日在内，都不知道。",
        "summary，结尾不给选项。本主线在此告一段落。",
      ].join("\n"),
      pace: "summary",
      requiresChoice: false,
      expectedSpan: "约一天",
    },
  ],
};

const summerIslandOutline: StoryOutline = {
  startingPointId: "summer_island",
  title: "孤岛事件 · 暴风雪山庄",
  arc: [
    "原作《凉宫春日的叹息》末尾'孤岛'事件。",
    "SOS 团应古泉远房亲戚多丸氏邀请前往孤岛别墅；台风将至；夜里出现'尸体'；本格推理博弈；最终揭穿这是古泉与多丸氏合谋的'剧本'。",
    "本主线为闭环事件链。",
  ].join(""),
  beats: [
    {
      id: "arrival",
      title: "上岛 · 多丸氏的欢迎",
      summary: [
        "渡船靠岸。多丸氏家族在码头列队迎接 SOS 团。别墅气派、菜肴丰盛、招待殷勤。",
        "春日明显已经处于'兴奋阈值'。古泉笑容标准。POV 视角下观察各位多丸氏成员的细节。",
        "本节拍 scene，结尾不给选项。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: false,
      expectedSpan: "约 1 小时",
    },
    {
      id: "two_quiet_days",
      title: "别墅生活的两天",
      summary: [
        "前两天没有任何'事件'。游泳、烧烤、海滩散步、晚餐时多丸家成员之间偶有几句紧张的家族话题。",
        "POV 视角下注意到几个细节（家族继承的争议、某位成员对另一位的冷淡）——这些是后续推理剧本要用的伏笔。",
        "summary，跨过两天。结尾不给选项。",
      ].join("\n"),
      pace: "summary",
      requiresChoice: false,
      expectedSpan: "两天",
    },
    {
      id: "typhoon_night",
      title: "台风夜 · 风渐强",
      summary: [
        "第三天傍晚，气象广播宣布台风将至。渡船停航 24 小时。",
        "晚餐气氛变得紧张。某位多丸家成员（'兄长'）言辞间与他人发生争执，提前离席回房。",
        "夜深，风雨交加。本节拍 scene，结尾不给选项。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: false,
      expectedSpan: "傍晚到夜里",
    },
    {
      id: "discovery",
      title: "发现'尸体'",
      summary: [
        "第二天早晨。'兄长'被发现死于自己房间——密室情境，钝器击杀。",
        "众人一片哗然。春日眼睛立刻亮起：'这就是我等了三天的事！'",
        "本节拍 scene，最后让玩家选择 POV 角色的第一反应。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "面对'死者'：呼喊报警？安抚朝比奈？观察现场细节？盯着古泉的反应？",
      expectedSpan: "早晨约半小时",
    },
    {
      id: "deduction_phase_1",
      title: "推理博弈（一）· 现场重建",
      summary: [
        "春日组织所有人在客厅集合，开始她的'推理'。多丸家成员之间互相指责。",
        "POV 视角下可观察各种线索：门窗状态、凶器位置、家族成员的不在场证明。",
        "本节拍 scene，最后让玩家选择 POV 角色提出的第一个推理思路。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "你的推理切入点：从动机切入？从密室物理切入？从某位成员的异常行为切入？反问古泉？",
      expectedSpan: "上午约 1 小时",
    },
    {
      id: "deduction_phase_2",
      title: "推理博弈（二）· 古泉的'破绽'",
      summary: [
        "随推理深入，POV 角色（特别是阿虚）注意到几个不合常理之处：",
        "'尸体'的姿势过于戏剧化、血迹颜色不像真正的血、某位多丸家成员强忍笑意。",
        "古泉的标准微笑这次出现了一次极轻微的破绽。",
        "本节拍 scene，最后让玩家选择是否当场揭穿。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: true,
      choiceHint: "是否当场揭穿这是一场剧：当众揭穿？私下找古泉？继续配合演完？还想再观察？",
      expectedSpan: "中午约 1 小时",
    },
    {
      id: "reveal",
      title: "揭穿 · 这是一场戏",
      summary: [
        "最终所有人摊牌：这是古泉与多丸氏合谋的本格推理剧本，目的是让春日在可控范围内得到'有趣事件'的满足。",
        "'死者'醒来鞠躬。春日的反应最关键——她可能恼火、可能大笑、可能立刻想要继续玩。",
        "POV 视角下记录这一刻所有人的表情。本节拍 scene，结尾不给选项。",
      ].join("\n"),
      pace: "scene",
      requiresChoice: false,
      expectedSpan: "约半小时",
    },
    {
      id: "departure",
      title: "台风过后 · 离岛",
      summary: [
        "第二天清晨。台风过去，渡船恢复。SOS 团在码头等船。",
        "春日抱怨'结尾不够刺激'，但她的眼睛已经在想下一个计划。",
        "POV 角色在风里看了一眼海平线。本节拍 summary，本主线在此结束。",
      ].join("\n"),
      pace: "summary",
      requiresChoice: false,
      expectedSpan: "约 2 小时",
    },
  ],
};

export const storyOutlines: Record<StartingPointId, StoryOutline | undefined> = {
  before_north_high: undefined,
  north_high_entrance: northHighEntranceOutline,
  sos_founded: sosFoundedOutline,
  after_members_joined: undefined,
  summer_island: summerIslandOutline,
  endless_eight: undefined,
  festival: undefined,
  disappearance: undefined,
  sasaki_faction: undefined,
};

export function findOutline(id: StartingPointId): StoryOutline | undefined {
  return storyOutlines[id];
}
