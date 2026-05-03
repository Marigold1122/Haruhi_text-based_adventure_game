// 一轮 LLM 响应的结构化输出协议
// 与 03_复用酒馆轮子方法.md 中 <event_json> 块对齐，
// 但加入身份/世界状态/事件链相关字段。

export type DialogueLine = {
  speaker: string;
  mood?: string;
  text: string;
};

export type VoiceCue = {
  /** 给 TTS / 表演层使用，不直接写进正文 */
  tone?: string;
  emotion?: string;
  delivery?: string;
  speed?: string;
  volume?: string;
  intensity?: number;
  pauseAfterMs?: number;
};

export type StoryBlock =
  | {
      type: "narration";
      text: string;
    }
  | {
      type: "dialogue";
      speaker: string;
      text: string;
      mood?: string;
      tts?: VoiceCue;
    };

export type StateChanges = {
  haruhiSatisfactionDelta?: number;
  worldStabilityDelta?: number;
  playerStressDelta?: number;
  addClues?: string[];
  addFlags?: string[];
  removeFlags?: string[];
  relationUpdates?: Array<{
    name: string;
    trustDelta?: number;
    affectionDelta?: number;
    note?: string;
  }>;
  identityShift?: import("./lorebook").IdentityLevel;
};

export type TimeAdvance = {
  days?: number;
  hours?: number;
  minutes?: number;
  note?: string;       // 中文展示串：例如 "次日早晨" / "傍晚回到部室" / "一周后" / "约半小时后"
};

export type StoryTurn = {
  eventTitle: string;
  scene: string;
  time: string;
  mood: string;

  /**
   * 旁白文本（无 speaker 时）或单句台词（有 speaker 时）。
   * 注意：这是这一段的"全部内容"，因此长度应控制在 30-100 字。
   */
  narration: string;

  /**
   * 对白说话人。
   *   · 设了 speaker → 这段是【对白段】，narration 字段就是这句台词的内容（UI 会以 "speaker：「narration」" 高亮渲染）
   *   · 未设 speaker → 这段是【旁白段】（标准段落显示）
   */
  speaker?: string;

  /** 仅 dialogue 段使用：说话语气标签（"兴奋"、"紧张"、"标准微笑"等） */
  // mood 已在上方独立字段——dialogue 段沿用同一字段表达语气

  /**
   * TTS / 表演元数据。只给系统使用，不应直接显示在正文里。
   * dialogue 段优先由 LLM 的 tone / emotion / delivery 等字段填充。
   */
  tts?: VoiceCue;

  /**
   * 一个点击展示单元内的连续文本块。新 Writer/Adapter 模式会优先填这里；
   * 旧存档和旧协议仍然只依赖 narration/speaker。
   */
  blocks?: StoryBlock[];

  /**
   * 旧的 dialogue 数组（已废弃，保留向前兼容旧存档）。
   * 新输出请用独立的 speaker 段，不要再填这个数组。
   */
  dialogue: DialogueLine[];

  stateChanges: StateChanges;

  // 节奏字段（1.0 之后的核心改造）
  pace: "summary" | "scene";       // summary = 一段文字概括 1-2 天；scene = 聚焦具体场景，紧贴剧情真实时间
  timeAdvance: TimeAdvance;        // 本轮叙述结束后时间向前推多少
  requiresChoice: boolean;         // 本轮结束时是否需要玩家做选择
  choices: string[];               // 仅在 requiresChoice 为 true 时有意义；2-4 个完整行动短句


  // 事件链相关（可选）
  chain?: {
    id: string;
    step: number;
    totalSteps: number;
    endMarker?: string;
  };
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  // 解析后的结构化数据（assistant 消息才有）
  parsed?: StoryTurn;
};
