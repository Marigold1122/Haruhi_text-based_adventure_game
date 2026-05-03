/**
 * 凉宫春日 AI 文字冒险 · 自动玩测脚本
 *
 * 模拟一个真实玩家从入学日开局玩 N 批的完整流程：
 *   1. 随机生成 MBTI 答案 → 匹配人格原型 → 生成最小卡
 *   2. 进入故事循环：decideEvent → buildPromptForTurn → 真调 LLM → 解析 → 随机选 choice
 *   3. 完整打印每批的 prompt 摘要、narrations、choices、玩家选择
 *   4. 终局打印：已触发 canon 事件、最终 state
 *
 * 用法：
 *   1. 在项目根创建 .env.local，包含：
 *        LLM_BASE_URL=https://api.deepseek.com
 *        LLM_API_KEY=sk-xxx
 *        LLM_MODEL=deepseek-v4-flash
 *   2. 运行：npx tsx scripts/playtest.ts
 *   3. 可选环境变量：
 *        NUM_BATCHES=10        # 默认 10 批
 *        START_IDENTITY=passerby   # 玩家身份
 *        PLAYER_NAME=佐藤悠       # 玩家姓名
 *        SUPPLEMENT="..."         # MBTI 后补充信息
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

// 加载 .env.local
try {
  const envText = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      // 去掉首尾空格 + 去掉首尾引号
      process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "").trim();
    }
  }
} catch {
  // .env.local 不存在就用 env 变量
}

const baseURL = (process.env.LLM_BASE_URL || "").trim().replace(/\/+$/, "");
const apiKey = (process.env.LLM_API_KEY || "").trim();
const model = (process.env.LLM_MODEL || "").trim();

if (!apiKey || !baseURL || !model) {
  console.error("ERROR: 缺少 LLM 配置。请在 .env.local 设置：");
  console.error("  LLM_BASE_URL=https://api.deepseek.com");
  console.error("  LLM_API_KEY=sk-xxx");
  console.error("  LLM_MODEL=deepseek-v4-flash");
  process.exit(1);
}

// 在导入项目模块之前先把 fetch-based LLM 注册好——避免触发 buildLLM(loadSettings) 的 mock 路径
import { setLLM, parseEventJsonBatch } from "@/lib/llm";
import { decideEvent, applyCanonProgress } from "@/lib/eventTrigger";
import { buildPromptForTurn } from "@/lib/prompting";
import { applyTurn } from "@/lib/worldState";
import { pushDate, clampTimeAdvance } from "@/lib/timeAdvance";
import { startingPointById } from "@/data/startingPoints";
import { renderTimelineContext } from "@/data/canonTimeline";
import { renderIdentityGuide } from "@/data/identityGuide";
import { hsuzumiyaLore } from "@/data/lorebooks/hsuzumiya_lore";
import { generateMinimalCard } from "@/lib/randomMode";
import { matchArchetype } from "@/lib/personalityMatcher";
import { mbtiQuiz } from "@/data/mbtiQuiz";
import { tailHistory, emptySummary, type SummaryState } from "@/lib/summary";
import type { ChatMessage } from "@/types/turn";
import type { WorldState } from "@/types/worldState";
import type { IdentityLevel } from "@/types/lorebook";

async function callLLM(
  messages: ChatMessage[],
  sampling: { temperature?: number; max_tokens?: number; top_p?: number },
): Promise<string> {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: sampling.temperature ?? 0.85,
      // DeepSeek-chat 支持 8192 max output tokens；避免 canon 批次的长 narration 被截断。
      // playtest 6 / 7 都因 LLM 输出超过 4000/4500 限制导致 JSON 截断，让测试中途中断。
      max_tokens: Math.max(sampling.max_tokens ?? 0, 8000),
      top_p: sampling.top_p ?? 0.95,
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// 注册 LLM 调用器，覆盖 mock
setLLM(callLLM as never);

// === 配置 ===
const NUM_BATCHES = parseInt(process.env.NUM_BATCHES || "20", 10);
const START_IDENTITY = (process.env.START_IDENTITY || "passerby") as IdentityLevel;
const PLAYER_NAME = process.env.PLAYER_NAME || "佐藤悠";
const SUPPLEMENT =
  process.env.SUPPLEMENT ||
  "父亲是大学物理教授，母亲是图书管理员；中学三年都在天文社；喜欢一个人在天台看云。";

// === 工具：分隔线、截断 ===
const HR = "═".repeat(64);
const HR2 = "─".repeat(64);
function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + `…(共${s.length}字)` : s;
}

async function main() {
  console.log(HR);
  console.log("凉宫春日 AI 文字冒险 · 自动玩测");
  console.log(HR);
  console.log(`配置：${baseURL} | model=${model} | batches=${NUM_BATCHES}`);
  console.log(`玩家：name=${PLAYER_NAME} | identity=${START_IDENTITY}`);
  console.log();

  // 1. 模拟 MBTI（随机答 10 题）
  const answers = Array.from({ length: 10 }, () => Math.floor(Math.random() * 4));
  const match = matchArchetype(answers, mbtiQuiz);
  console.log("【MBTI 测试】");
  console.log(`  答题：[${answers.join(",")}]`);
  console.log(`  匹配原型：${match.archetype}`);
  console.log(
    `  画像：` +
      Object.entries(match.normalizedStats)
        .map(([k, v]) => `${k.slice(0, 3)}=${v.toFixed(1)}`)
        .join(" "),
  );
  console.log(`  排名前 3：${match.ranking.slice(0, 3).map((r) => `${r.archetype}(${r.similarity}%)`).join(" / ")}`);
  console.log();

  // 2. 生成最小卡
  console.log("【生成玩家最小卡】");
  const cardStart = Date.now();
  let card;
  try {
    card = await generateMinimalCard({
      name: PLAYER_NAME,
      match,
      supplement: SUPPLEMENT,
      identity: START_IDENTITY,
    });
  } catch (e) {
    console.error(`卡生成失败：${(e as Error).message}`);
    process.exit(1);
  }
  console.log(`  耗时：${((Date.now() - cardStart) / 1000).toFixed(1)}s`);
  console.log(`  名称：${card.data.name}`);
  console.log(`  scenario：${trunc(card.data.scenario, 200)}`);
  console.log();

  // 3. 初始化 state
  const point = startingPointById["north_high_entrance"]!;
  let state: WorldState = {
    ...point.initialState,
    playerCharacterId: "__custom__",
    identity: START_IDENTITY,
  };
  let history: ChatMessage[] = [];
  const summary: SummaryState = emptySummary;

  // 4. 主循环
  let userInput = "__story_open__";
  for (let batchIdx = 0; batchIdx < NUM_BATCHES; batchIdx++) {
    console.log(HR);
    console.log(`【批次 ${batchIdx + 1} / ${NUM_BATCHES}】`);
    console.log(
      `日期=${state.date.iso}  身份=${state.identity}  ` +
        `满足=${state.haruhiSatisfaction}  稳定=${state.worldStability}  压力=${state.playerStress}`,
    );
    console.log(`已触发 canon：${state.triggeredCanonEvents.length} 个`);

    const decision = decideEvent(state);
    console.log(`决策：eventKind=${decision.eventKind}`);
    console.log(`原因：${decision.reason}`);
    if (decision.canonFocus) {
      const e = decision.canonFocus;
      console.log(
        `★ 原作焦点：${e.title}（${e.date.iso}）` +
          ` [scope=${e.scope} importance=${e.importance} visibility=${e.visibility}]`,
      );
    }

    // Build state with chain proposal
    let next = state;
    if (!next.activeChain && decision.proposedChain) {
      next = {
        ...next,
        activeChain: {
          id: decision.proposedChain.id,
          step: 1,
          totalSteps: decision.proposedChain.totalSteps,
        },
      };
    }

    const promptUser =
      userInput === "__story_open__"
        ? "（故事开始。请按 scenario 与世界书自然展开本轮事件，不要直接介绍角色。请按输出协议返回多段。）"
        : userInput;

    const visibleHistory = tailHistory(history, summary);
    const sceneCast = startingPointById[next.startingPoint]?.sceneCast;
    const timelineContext = renderTimelineContext({
      currentIso: next.date.iso,
      identity: next.identity,
    });
    const identityGuide = renderIdentityGuide(next.identity);

    const built = buildPromptForTurn({
      mode: "legacy",
      card,
      lorebook: hsuzumiyaLore,
      state: next,
      eventKind: decision.eventKind,
      history: visibleHistory,
      summary: summary.text,
      userInput: promptUser,
      sceneCast,
      timelineContext,
      identityGuide,
      canonFocus: decision.canonFocus,
    });

    const totalChars = built.messages.reduce((s, m) => s + m.content.length, 0);
    const activeLore = built.trace.activeLoreEntries ?? [];
    console.log(`Prompt：${built.messages.length} 条消息 / 共 ${totalChars} 字`);
    console.log(`激活的世界书条目（${activeLore.length}）：${activeLore.slice(0, 8).join(" · ") || "无"}`);

    // 调 LLM
    let raw: string;
    const llmStart = Date.now();
    try {
      raw = await callLLM(built.messages, built.sampling);
    } catch (e) {
      console.error(`LLM 调用失败：${(e as Error).message}`);
      break;
    }
    const llmTime = ((Date.now() - llmStart) / 1000).toFixed(1);
    console.log(`LLM 响应：${raw.length} 字 / ${llmTime}s`);

    // 解析
    const batch = parseEventJsonBatch(raw);
    if (batch.length === 0) {
      console.error(`解析失败！原始预览：${trunc(raw, 400)}`);
      break;
    }
    console.log(`段数：${batch.length}`);
    console.log(HR2);

    // 打印每段
    for (let i = 0; i < batch.length; i++) {
      const t = batch[i];
      if (t.eventTitle && i === 0) {
        console.log(`  ▸ 事件：${t.eventTitle}${t.scene ? ` · ${t.scene}` : ""}`);
      }
      if (t.speaker) {
        console.log(
          `  [${(i + 1).toString().padStart(2, "0")}] ${t.speaker}${t.mood ? "·" + t.mood : ""}：「${t.narration}」`,
        );
      } else {
        console.log(`  [${(i + 1).toString().padStart(2, "0")}] ${t.narration}`);
      }
    }

    // 应用 turns（clampTimeAdvance v3：基于 dailyBudget 均摊式 clamp）
    // 注意：parser 把整批 timeAdvance 只放在【最后一段 turn】上（其他 turn 是占位），
    // 所以 clamp 也只应用在最后一段——否则每个占位段都会触发 clamp，多 turn 累计过冲。
    const inCanonFocus = !!decision.canonFocus;
    let advanced = next;
    for (let i = 0; i < batch.length; i++) {
      const t = batch[i];
      const isLastInBatch = i === batch.length - 1;
      const clamp = isLastInBatch
        ? clampTimeAdvance(t.timeAdvance, advanced, inCanonFocus)
        : { advance: t.timeAdvance, clamped: false, reason: undefined as string | undefined };
      if (clamp.clamped && clamp.reason) console.log(`  ⚠ ${clamp.reason}`);
      advanced = applyTurn(
        {
          ...advanced,
          date: pushDate(advanced.date, clamp.advance),
          flow: t.pace === "scene" ? "chain" : "weekly",
        },
        t,
      );
    }
    advanced = applyCanonProgress(advanced, decision);
    state = advanced;

    // 更新 history
    const userMsg: ChatMessage = { role: "user", content: promptUser };
    const aiMsg: ChatMessage = { role: "assistant", content: raw, parsed: batch[0] };
    history = [...history, userMsg, aiMsg];

    // 选 choice
    console.log(HR2);
    const lastTurn = batch[batch.length - 1];
    if (lastTurn.requiresChoice && lastTurn.choices.length > 0) {
      console.log(`选择项 (${lastTurn.choices.length})：`);
      lastTurn.choices.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
      const idx = Math.floor(Math.random() * lastTurn.choices.length);
      const chosen = lastTurn.choices[idx];
      console.log(`>>> 玩家随机选：${idx + 1}. ${chosen}`);
      userInput = chosen;
    } else {
      // canon intro/developing 阶段允许无 choice 批——剧情自然延续到下一批。
      // 给 LLM 一个明确的"延续上批末尾张力点"信号，而不是"继续日常"。
      const inActiveCanon = !!state.activeCanon;
      console.log(
        inActiveCanon
          ? `本批 requiresChoice=false（canon ${state.activeCanon!.narrativePhase} 阶段允许）—延续上批末尾张力点`
          : `本批 requiresChoice=false—自动继续`,
      );
      userInput = inActiveCanon
        ? "（延续上批末尾的张力点，继续 canon 演绎。）"
        : "（继续推进当前故事。）";
    }
    console.log();
  }

  // 终结
  console.log(HR);
  console.log("【测试结束 · 最终状态】");
  console.log(HR);
  console.log(`日期：${state.date.iso}`);
  console.log(`身份：${state.identity}`);
  console.log(
    `数值：满足=${state.haruhiSatisfaction} 稳定=${state.worldStability} 压力=${state.playerStress}`,
  );
  console.log(`已触发 canon 事件（${state.triggeredCanonEvents.length} 个，按触发顺序）：`);
  state.triggeredCanonEvents.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));
  console.log("关系：");
  for (const r of Object.values(state.relations)) {
    console.log(`  · ${r.name}：trust=${r.trust} affection=${r.affection}${r.note ? ` (${r.note})` : ""}`);
  }
  console.log(`flags：${state.flags.join(" · ") || "无"}`);
  console.log(`clues：${state.clues.join(" · ") || "无"}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
