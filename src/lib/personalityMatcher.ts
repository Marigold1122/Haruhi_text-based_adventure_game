// 人格匹配算法（v2 · 8 维参数 + 欧氏距离）
//
// 流程：
//   1. computeRawStats —— 累计玩家答案给的所有参数加点
//   2. computeMaxStats —— 计算每个参数在 10 道题里的理论最大可能加点
//   3. normalizeStats —— 把玩家累计分按"该参数最大可能值的百分比 × 10"归一化到 0-10
//   4. matchArchetype —— 与 8 个原型画像求欧氏距离，距离最小即匹配
//   5. similarityRanking —— 把所有原型按相似度排名（用于 UI 展示）

import {
  type CharacterArchetype,
  type Stats,
  archetypeInfo,
  allArchetypes,
  emptyStats,
  statKeys,
} from "@/data/characterArchetypes";
import type { QuizQuestion } from "@/data/mbtiQuiz";

// ----------------------------------------------------------------------
// 步骤 1：累计原始得分
// ----------------------------------------------------------------------

export function computeRawStats(
  answers: number[],
  questions: QuizQuestion[],
): Stats {
  const stats = emptyStats();
  for (let i = 0; i < questions.length; i++) {
    const choice = answers[i];
    if (choice === undefined || choice < 0 || choice > 3) continue;
    const opt = questions[i].options[choice];
    if (!opt) continue;
    for (const k of statKeys) {
      const delta = opt.deltas[k];
      if (typeof delta === "number") stats[k] += delta;
    }
  }
  return stats;
}

// ----------------------------------------------------------------------
// 步骤 2：计算每个参数的理论最大值（10 道题每题取该参数最高的选项加分之和）
// ----------------------------------------------------------------------

export function computeMaxStats(questions: QuizQuestion[]): Stats {
  const max = emptyStats();
  for (const q of questions) {
    for (const k of statKeys) {
      let bestThisQ = 0;
      for (const opt of q.options) {
        const v = opt.deltas[k];
        if (typeof v === "number" && v > bestThisQ) bestThisQ = v;
      }
      max[k] += bestThisQ;
    }
  }
  return max;
}

// ----------------------------------------------------------------------
// 步骤 3：归一化到 0-10
// ----------------------------------------------------------------------

export function normalizeStats(raw: Stats, max: Stats): Stats {
  const out = emptyStats();
  for (const k of statKeys) {
    const m = max[k];
    out[k] = m > 0 ? (raw[k] / m) * 10 : 0;
  }
  return out;
}

// ----------------------------------------------------------------------
// 步骤 4：欧氏距离 + 匹配最近的原型
// ----------------------------------------------------------------------

export function distance(a: Stats, b: Stats): number {
  let sum = 0;
  for (const k of statKeys) {
    const diff = a[k] - b[k];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** 8 维向量在每个维度 0-10 的最大欧氏距离 = sqrt(8 × 100) ≈ 28.28 */
export const MAX_DISTANCE = Math.sqrt(statKeys.length * 100);

/** 把距离转换为相似度百分比（0-100） */
export function similarityPercent(d: number): number {
  const sim = Math.max(0, 1 - d / MAX_DISTANCE);
  return Math.round(sim * 100);
}

// ----------------------------------------------------------------------
// 步骤 5：完整匹配 + 排名
// ----------------------------------------------------------------------

export type MatchResult = {
  archetype: CharacterArchetype;       // 最匹配的原型
  rawStats: Stats;                     // 玩家累计原始分（未归一化）
  normalizedStats: Stats;              // 归一化到 0-10 的玩家画像
  ranking: Array<{                     // 所有原型按相似度排名
    archetype: CharacterArchetype;
    distance: number;
    similarity: number;                // 0-100
  }>;
};

export function matchArchetype(
  answers: number[],
  questions: QuizQuestion[],
): MatchResult {
  const rawStats = computeRawStats(answers, questions);
  const maxStats = computeMaxStats(questions);
  const normalizedStats = normalizeStats(rawStats, maxStats);

  const ranking = allArchetypes
    .map((a) => {
      const d = distance(normalizedStats, archetypeInfo[a].profile);
      return { archetype: a, distance: d, similarity: similarityPercent(d) };
    })
    .sort((x, y) => x.distance - y.distance);

  return {
    archetype: ranking[0].archetype,
    rawStats,
    normalizedStats,
    ranking,
  };
}
