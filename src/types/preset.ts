// 酒馆 Preset：System Prompt + 采样参数 + Author's Note 模板
//
// 每种事件类型对应一个 Preset。Prompt Router 根据事件类型/身份/世界状态
// 选择 Preset，把它的 system_prompt 与角色卡 system_prompt 合并。

export type EventPresetKind =
  | "daily"          // 日常
  | "campus"         // 校园
  | "interpersonal"  // 人际
  | "encounter"      // 奇遇
  | "supernatural"   // 超自然事件链
  | "seasonal";      // 季节性

export type SamplingParams = {
  temperature: number;
  top_p?: number;
  top_k?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  max_tokens?: number;
};

export type Preset = {
  name: string;
  kind: EventPresetKind;
  description?: string;

  // 与角色卡 system_prompt 合并；通常用 {{char}} {{user}} 等酒馆占位符
  system_prompt: string;

  // 高优先级临时注入模板，会被 Prompt Router 替换变量后注入
  // 支持的占位符：{{world_state}} {{identity}} {{date}} {{flow}} {{chain}}
  authors_note_template: string;

  sampling: SamplingParams;
};
