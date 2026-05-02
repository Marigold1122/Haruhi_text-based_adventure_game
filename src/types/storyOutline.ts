// 剧情大纲（StoryOutline）
//
// 设计目标：
// - 每个起点配一份按原作主线的节拍序列（beats）
// - LLM 严格按当前节拍推进；只在标注 requiresChoice=true 的节拍开放玩家选择
// - 日常节拍只允许"继续"——玩家不能凭空介入
//
// 一个节拍可能需要 1~多 轮叙述完成（特别是 scene 节拍）。
// LLM 完成当前节拍时在 turn.beatComplete=true，下一轮自动推进到下一节拍。

import type { StartingPointId } from "./worldState";

export type StoryBeat = {
  id: string;
  title: string;
  /** 给 LLM 看的：这一节拍要演的内容（写明事件、人物、关键对白、关系变化） */
  summary: string;
  /** 节奏：summary=概括跨多日；scene=聚焦具体场景紧贴剧情真实时间 */
  pace: "summary" | "scene";
  /** 该节拍最后一轮是否需要玩家选择（开放选项 + 自定义输入） */
  requiresChoice: boolean;
  /** 若 requiresChoice=true，给 LLM 的提示：选项应当围绕什么 */
  choiceHint?: string;
  /** 这一节拍预计跨度："约一周" / "一个下午" / "三天"——同时用于 timeAdvance 暗示 */
  expectedSpan?: string;
  /** 进入这一节拍时是否要切换事件链（chain id） */
  enterChain?: string;
};

export type StoryOutline = {
  startingPointId: StartingPointId;
  title: string;
  /** 这条主线的总体方向（一两句话给 LLM 看），让 LLM 知道整体在向哪里走 */
  arc: string;
  beats: StoryBeat[];
};
