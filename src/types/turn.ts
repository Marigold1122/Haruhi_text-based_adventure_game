// 一轮 LLM 响应的结构化输出协议
// 与 03_复用酒馆轮子方法.md 中 <event_json> 块对齐，
// 但加入身份/世界状态/事件链相关字段。

export type DialogueLine = {
  speaker: string;
  mood?: string;
  text: string;
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

export type StoryTurn = {
  eventTitle: string;
  scene: string;
  time: string;
  mood: string;
  narration: string;          // 旁白
  dialogue: DialogueLine[];   // 对白
  stateChanges: StateChanges;
  choices: string[];          // 2-4 个固定选项；玩家也可走自定义输入

  // 事件链相关（可选）
  chain?: {
    id: string;
    step: number;
    totalSteps: number;
    endMarker?: string;       // AI 在最后一节标记结束
  };
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  // 解析后的结构化数据（assistant 消息才有）
  parsed?: StoryTurn;
};
