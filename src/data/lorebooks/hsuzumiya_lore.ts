import type { Lorebook } from "@/types/lorebook";

// 主世界书：hsuzumiya_lore
// 三类条目：
//   1. constant：永远注入（基础设定）
//   2. 关键词触发：聊天历史 / 当前输入命中关键词时注入
//   3. 身份门控：通过 extensions.identity_gate 控制可见性
//   4. 事件链专属：通过 extensions.chain_id 在对应事件链激活时挂载

export const hsuzumiyaLore: Lorebook = {
  name: "hsuzumiya_lore",
  description: "凉宫春日系列主世界书，参考原作小说改写。",
  scan_depth: 4,
  recursive_scanning: true,

  entries: [
    // ============= constant：永远注入 =============
    {
      name: "北口高校",
      keys: ["北高", "北口高校", "学校"],
      content:
        "北口高校（通称'北高'）位于半山腰，从车站出来要爬一段不短的坡道。" +
        "校服为标准水手服 / 学兰式样，校风普通。文艺部部室在旧馆三楼，长期只有长门一人。",
      enabled: true,
      constant: true,
      insertion_order: 100,
      position: "after_char",
    },
    {
      name: "SOS 团基本设定",
      keys: ["SOS 团", "SOS团"],
      content:
        "SOS 团：使世界变得更热闹的凉宫春日团。由凉宫春日强行成立，团员包括阿虚、长门有希、朝比奈实玖瑠、古泉一树。" +
        "活动地点在文艺部部室。袖章上印有 SOS 三字。",
      enabled: true,
      constant: true,
      insertion_order: 95,
      position: "after_char",
    },
    {
      name: "当前年代背景",
      keys: ["年代", "时代", "现在"],
      content:
        "故事时代约为 2000 年代初的日本西部某城。手机刚刚普及，互联网拨号尚未远去。" +
        "学校生活围绕着公立高中的春-夏-秋-冬节奏展开。",
      enabled: true,
      constant: true,
      insertion_order: 90,
      position: "after_char",
    },

    // ============= 关键词触发：地点 =============
    {
      name: "文艺部部室",
      keys: ["文艺部", "部室", "旧馆三楼"],
      content:
        "文艺部部室位于北高旧馆三楼最里侧，房间狭长，靠窗一排长桌，角落有一台老式电脑。" +
        "墙边书架塞满硬皮书。长门有希通常坐在窗边读书，从不主动开口。",
      enabled: true,
      insertion_order: 80,
      position: "after_char",
    },
    {
      name: "电脑研究部",
      keys: ["电脑研究部", "电研"],
      content:
        "电脑研究部社长性格温厚但优柔，被春日讹来一台电脑作为'SOS 团第一台电脑'，事件由阿虚出面收拾。",
      enabled: true,
      insertion_order: 70,
      position: "after_char",
    },

    // ============= 关键词触发：人物 =============
    {
      name: "长门有希",
      keys: ["长门", "有希", "长门有希"],
      content:
        "北高一年九班，文艺部唯一部员。沉默寡言，几乎不显露表情。喜欢硬皮书。" +
        "被周围人当成超内向的眼镜少女，但她不是人类——这一信息只在身份允许时披露。",
      enabled: true,
      insertion_order: 75,
      position: "after_char",
    },
    {
      name: "朝比奈实玖瑠",
      keys: ["朝比奈", "实玖瑠", "学姐"],
      content:
        "北高二年级，娇小可爱，胸前丰满，泡茶手艺一流。" +
        "对春日抱有恐惧但不敢反抗。其真实身份为受限制级别的某未来人，仅在身份允许时披露。",
      enabled: true,
      insertion_order: 75,
      position: "after_char",
    },
    {
      name: "古泉一树",
      keys: ["古泉", "古泉一树"],
      content:
        "北高一年九班的转学生，五官端正、笑容标准化到令人不安。" +
        "口才极好，能用模型化的措辞回避所有尖锐问题。其真实身份为协会派来的超能力者，仅在身份允许时披露。",
      enabled: true,
      insertion_order: 75,
      position: "after_char",
    },
    {
      name: "佐佐木",
      keys: ["佐佐木"],
      content:
        "阿虚的初中同窗，理性派，常带温和笑容。话语逻辑严密，与春日构成对照。" +
        "她的高中并非北高。其在某些时间线上将作为另一派的关键节点出现。",
      enabled: true,
      insertion_order: 60,
      position: "after_char",
    },

    // ============= 身份门控：超自然真相 =============
    {
      name: "闭锁空间机制",
      keys: ["闭锁空间", "神人", "灰色世界"],
      content:
        "当凉宫春日的潜在不满或情绪过激累积到临界，会无意识地从现实中切出'闭锁空间'：" +
        "灰蓝调的扭曲世界，空无一人，街景缓慢溶解。" +
        "其中诞生体型巨大的蓝色'神人'，破坏空间内一切。" +
        "若闭锁空间无法收束，将吞噬其在现实中的对应区域。" +
        "处理方式：超能力者协会派出的能力者进入并击败神人。",
      enabled: true,
      insertion_order: 85,
      position: "after_char",
      extensions: {
        identity_gate: ["core", "anomaly", "observer"],
      },
    },
    {
      name: "信息统合思念体",
      keys: ["思念体", "信息统合思念体"],
      content:
        "宇宙规模的信息生命体集合。长门有希是其派遣的人型接口，任务为观测凉宫春日。" +
        "内部存在多个派系，对'是否应当观测'与'是否应当干预'存在分歧。",
      enabled: true,
      insertion_order: 85,
      position: "after_char",
      extensions: {
        identity_gate: ["core", "anomaly", "observer"],
      },
    },
    {
      name: "时间平面与未来人",
      keys: ["未来人", "时间平面", "禁则"],
      content:
        "未来某时点之后人类无法回溯到该时点之前——这条时间断层称为'禁则'。" +
        "朝比奈实玖瑠属未来人组织，被严格限制可对当代说出的内容。" +
        "禁则起点疑似与春日有关。",
      enabled: true,
      insertion_order: 85,
      position: "after_char",
      extensions: {
        identity_gate: ["core", "anomaly", "observer"],
      },
    },

    // ============= 事件链专属：闭锁空间 =============
    {
      name: "闭锁空间内的触感",
      keys: ["闭锁空间内", "灰色街道"],
      content:
        "进入闭锁空间后，所有声音被剥离，只剩自身呼吸。地面有轻微弹性。" +
        "物体颜色被滤至冷蓝灰。神人撕裂空间的动作伴随沉闷的低频声波。",
      enabled: true,
      insertion_order: 80,
      position: "after_char",
      extensions: {
        chain_id: "closed_space",
        identity_gate: ["core", "anomaly", "observer"],
      },
    },

    // ============= 风格与边界 =============
    {
      name: "叙事风格指引",
      keys: ["风格"],
      content:
        "保持原作的'校园日常 + 突如其来的非常识'对比。" +
        "日常段落写细节（粉笔屑、廊道光线、罐装咖啡的温度），异常段落写错位（声音消失、影子方向不对、时间感失真）。" +
        "不一次性揭示真相；身份未允许的角色不应理解超自然事件的本质。",
      enabled: true,
      constant: true,
      insertion_order: 60,
      position: "after_char",
    },
    {
      name: "禁止事项",
      keys: ["禁止"],
      content:
        "不替玩家做重大决定。" +
        "不读心。每轮只推进一个事件点。" +
        "异常等级或满足度由 stateChanges 反映，不要在叙述中直接报数字。" +
        "回复结尾必须只有一个 <event_json>...</event_json> 块。",
      enabled: true,
      constant: true,
      insertion_order: 110, // 优先级最高，最靠近 prompt 末尾
      position: "after_char",
    },
  ],
};
