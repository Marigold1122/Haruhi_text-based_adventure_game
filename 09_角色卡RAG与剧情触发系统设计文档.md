# 09. 角色卡 RAG 与剧情触发系统设计文档

## 目标

这份文档用于指导后续改造：

```text
把角色卡、世界书、原作事实、剧情节点都纳入统一 RAG 内容系统；
用 Plot Governor 控制事件触发时机；
用平淡度检测和长期进度钟避免故事变成流水账。
```

当前阶段先不要求立刻实现全部能力。黑客松优先目标是：

- 保持现有前端、存档、LLM 调用、点击式阅读流程不大改。
- 保留现有 `WorldState`、`Lorebook`、`canonTimeline`、`eventChains` 的价值。
- 让角色卡可以写得完整，但运行时按需检索，不每轮整张塞给模型。
- 让世界书真正承担 RAG 资料库职责。
- 让事件触发从“随机事件类型”升级为“有条件、有冲突、有后果的剧情节点”。
- 增加平淡度检测，连续无推进时主动提高小事件、关系事件、异常苗头的触发权重。

如果后续发生上下文压缩，继续此任务前必须重新读取本文件。

## 外部成熟系统参考

本方案不是从零发明，而是借用几个成熟系统的思想。

| 系统 | 核心思想 | 对本项目的启发 |
|---|---|---|
| SillyTavern World Info | 按关键词、角色、聊天、persona 等上下文动态注入世界书条目 | 世界书是轻量 RAG，不应只靠固定 prompt |
| SillyTavern Data Bank | 把文档作为可检索资料注入聊天上下文 | 厚角色卡、原作资料、设定文档都可以资产化 |
| SillyTavern Author's Note | 靠近 prompt 末尾的高优先级临时指令 | Runtime State 和本轮剧情钩子应靠后注入 |
| GraphRAG | 把资料拆成实体、关系、事件和摘要 | 世界树应从文本块升级为“角色、地点、事件、关系”的图式资料 |
| Storylets / StoryNexus | 剧情由小节点组成，每个节点有条件、结果、状态变化 | 事件触发应改为 storylet 节点库 |
| Valve AI Director | 监控玩家体验强度，动态制造峰谷 | 平淡度检测负责避免连续无事发生 |
| Progress Clocks | 用进度钟追踪危险、关系、倒计时和长期目标 | SOS 卷入度、春日注意度、异常压力都适合做 clock |
| Generative Agents | 记忆、反思、计划让角色行为长期稳定 | NPC 记忆应结构化，不只依赖自然语言 summary |
| Drama Llama | 作者保持 storylet 控制，LLM 负责自然语言生成 | 本项目应让代码选剧情，模型写正文 |

参考链接：

- SillyTavern World Info: <https://docs.sillytavern.app/usage/core-concepts/worldinfo/>
- SillyTavern Data Bank: <https://docs.sillytavern.app/usage/core-concepts/data-bank/>
- SillyTavern Author's Note: <https://docs.sillytavern.app/usage/core-concepts/authors-note/>
- SillyTavern Prompts: <https://docs.sillytavern.app/usage/prompts/>
- Microsoft GraphRAG: <https://microsoft.github.io/graphrag/>
- Storylets 论文: <https://mkremins.github.io/publications/Storylets_SketchingAMap.pdf>
- Failbetter StoryNexus 技巧: <https://www.failbettergames.com/news/narrative-snippets-storynexus-tricks>
- Valve Left 4 Dead AI Director: <https://steamcdn-a.akamaihd.net/apps/valve/2009/GDC2009_ReplayableCooperativeGameDesign_Left4Dead.pdf>
- Blades in the Dark Progress Clocks: <https://bladesinthedark.com/progress-clocks>
- Generative Agents: <https://arxiv.org/abs/2304.03442>
- Drama Llama: <https://arxiv.org/abs/2501.09099>

## 核心结论

最终结构应当是：

```text
内容资产层
  角色卡、世界书、原作资料、地点、人设、事件说明
  统一拆成 RAG 条目

运行状态层
  WorldState、关系、flags、clues、当前身份、当前日期、当前事件链
  每轮固定注入，作为当前世界权威

剧情调度层
  Plot Governor、Storylet 节点库、Canon Timeline、Progress Clocks
  决定本轮“该发生什么”

体验调度层
  Blandness Meter、Intensity Meter、Cooldown
  避免故事连续平淡或连续过载

生成层
  Prompt Builder + DeepSeek
  根据已选素材和剧情钩子写正文
```

一句话：

```text
RAG 管“能写什么”，Plot Governor 管“现在该发生什么”，平淡度检测管“别一直没事发生”，LLM 只负责写得好看。
```

## 现在项目的问题

当前项目已经有很多可复用模块：

- `src/types/worldState.ts`：有日期、身份、关系、flags、clues、事件链。
- `src/types/lorebook.ts`：接近 SillyTavern World Info 格式，有 `identity_gate` 和 `chain_id`。
- `src/data/lorebooks/hsuzumiya_lore.ts`：已有大量人物、地点、原作事实。
- `src/data/canonTimeline.ts`：已经能按日期强制触发原作主线。
- `src/data/eventChains.ts`：已有 8 条事件链元数据。
- `src/lib/eventTrigger.ts`：已经把“是否触发事件”放在代码侧。
- `src/lib/promptRouter.ts`：已有酒馆 9 步式 prompt 拼装。
- `src/lib/summary.ts`：已有滚动摘要。

但问题也很明确：

| 问题 | 后果 |
|---|---|
| 角色卡和世界书职责没有统一 RAG 化 | 厚角色卡每轮注入会拖慢，薄角色卡又容易失去人设 |
| 世界书主要靠关键词命中 | 没提到角色名时，人设可能不注入，导致角色更不出现 |
| 事件触发只决定 `daily / encounter / supernatural` 类型 | 模型仍要自己想“发生什么”，容易平淡 |
| 事件链只有 `id / step / totalSteps` | 缺少阶段目标、阻碍、后果和结束条件 |
| Summary 是自然语言 | 可读但不能作为权威状态账本 |
| 平淡度没有被检测 | 连续环境描写、无变化选项、无关系推进时无法自动纠偏 |

## 设计边界

### 必须坚持

- 角色卡可以厚，但运行时不能每轮整张全塞。
- 世界书是 RAG 系统，不只是“背景设定 prompt”。
- 原作事实、NPC 人设、地点、组织、事件都应进入可检索资料库。
- 当前运行状态必须由代码维护，不能让 LLM 自己决定世界真相。
- Canon 事件的客观结果由 `canonTimeline` 控制，玩家只能改变观察角度、参与方式和人际后果。
- 平淡度检测先用规则做，不额外调用 LLM。
- 黑客松阶段不引入复杂向量数据库，先用确定性规则检索，后续再加 embeddings。

### 不做的事

- 不重写前端阅读流程。
- 不推翻现有 `WorldState`。
- 不把世界书、文风、输出协议混成一个大 prompt。
- 不让 LLM 自主决定是否触发主线事件。
- 不把自然语言 summary 当作唯一长期记忆。
- 不为每个节点做大型剧情脚本，先做小而清晰的 storylet。

## 内容资产 RAG 化

### 资产来源

所有内容资产都进入统一索引：

| 来源 | 是否进入 RAG | 说明 |
|---|---|---|
| 玩家角色卡 | 是 | 拆成 POV、人设、语气、背景、秘密、关系条目 |
| NPC 角色卡 | 是 | 春日、阿虚、长门、朝比奈、古泉等详细人设 |
| Campaign Card | 是 | 作品入口、世界规则、不可违背事实 |
| 世界书 | 是 | 人物、地点、组织、事件、原作术语 |
| Canon Timeline | 是 | 每条 canon event 可作为时间窗口条目 |
| Event Chains | 是 | 每条事件链拆成阶段资料 |
| 参考文风 | 否或少量 | 文风由文风层控制，不混进事实 RAG |
| Runtime State | 不是静态 RAG | 每轮动态生成，作为临时世界书注入 |

### RAG 条目格式

建议新增统一条目类型。黑客松阶段可以先在现有 `LoreEntry.extensions` 上扩展，不必新建数据库。

```ts
type RagEntry = {
  id: string;
  title: string;
  content: string;

  kind:
    | "pov"
    | "character_profile"
    | "character_voice"
    | "character_memory"
    | "location"
    | "organization"
    | "canon_event"
    | "storylet"
    | "arc_stage"
    | "world_rule"
    | "runtime";

  entityIds?: string[];
  aliases?: string[];
  locationTags?: string[];
  arcIds?: string[];
  dateWindow?: {
    from?: string;
    to?: string;
    beforeDays?: number;
    afterDays?: number;
  };
  identityGate?: string[];
  chainId?: string;
  flagsRequired?: string[];
  flagsBlocked?: string[];
  relationGate?: Array<{
    target: string;
    minTrust?: number;
    maxTrust?: number;
    minAffection?: number;
    maxAffection?: number;
  }>;

  priority: number;
  tokenBudgetHint?: number;
  position?: "before_char" | "after_char" | "author_note";
};
```

### 角色卡如何拆

角色卡不需要变薄，写作时可以继续完整。运行时拆成以下片段：

```text
character.core_identity
character.public_profile
character.private_profile
character.voice
character.behavior_rules
character.relationship_to_player
character.relationship_to_sos
character.example_dialogue
character.hidden_knowledge
character.current_memory
```

例子：

```ts
{
  id: "char_haruhi_core",
  kind: "character_profile",
  title: "凉宫春日 · 核心人设",
  entityIds: ["haruhi"],
  aliases: ["凉宫春日", "春日", "黄丝带女生", "团长"],
  content: "北高一年五班学生，行动力极强，对普通日常缺乏耐心，寻找外星人、未来人、异世界人、超能力者。她不是装怪，而是真诚期待世界有趣起来。",
  priority: 95,
  position: "after_char"
}
```

### 检索顺序

每轮 RAG 选择器按以下顺序执行：

```text
1. 固定最小 POV
   当前玩家是谁、第一人称、不得替玩家决定

2. Runtime State
   日期、地点、身份、关系、flags、clues、activeArc、canonFocus

3. 强制激活
   当前 POV 卡核心条目
   sceneCast 中出现的角色
   当前 location
   当前 activeStorylet
   当前 canonFocus

4. 确定性检索
   date window
   identityGate
   chainId
   flagsRequired
   relationGate

5. 关键词检索
   玩家输入
   最近 4 到 8 个 beat
   当前 choices

6. 后续增强
   embeddings 语义检索
   GraphRAG 实体邻接扩展
```

重点：强制激活必须先于关键词。否则会出现“没有注入春日人设，所以模型没写春日；模型没写春日，所以下一轮仍不注入春日”的死循环。

### Token 预算

建议每轮资料预算先控制在：

```text
固定 POV：100 到 200 中文字
Runtime State：300 到 600 中文字
强制角色资料：每人 120 到 250 中文字
地点资料：80 到 180 中文字
当前 storylet：120 到 250 中文字
canonFocus：200 到 400 中文字
其他世界书命中：总计 600 到 1200 中文字
```

DeepSeek 支持长上下文，但不等于应该无脑塞。文风、速度、注意力稳定性都更依赖“短而准”的上下文。

## Plot Governor

Plot Governor 是事件调度器。它不写正文，只决定本轮剧情压力。

输入：

```text
WorldState
recent turns
summary
current sceneCast
current location
canonTimeline window
active clocks
blandnessScore
available storylets
```

输出：

```ts
type PlotDecision = {
  eventKind: EventPresetKind;
  selectedStorylet?: StoryletNode;
  canonFocus?: CanonEvent;
  proposedChain?: { id: string; totalSteps: number };
  reason: string;
  intensityTarget: number;
  ragHints: {
    forceEntityIds: string[];
    forceLocationTags: string[];
    forceEntryIds: string[];
  };
};
```

Prompt 中只注入简短版本：

```text
[本轮剧情调度]
钩子：春日注意到玩家刚才看了她好几眼。
冲突：玩家想保持普通路人姿态，但春日不喜欢别人只是旁观。
不可改变：入学日宣言照常发生，阿虚仍坐在春日前方。
可变结果：春日是否记住玩家；阿虚是否注意到玩家；玩家是否更靠近 SOS 团。
强度目标：35/100，轻微紧张，不要写成大事件。
```

## Storylet 节点库

Storylet 是最重要的事件单位。它比完整剧情脚本短，但比随机事件类型具体。

### 节点格式

```ts
type StoryletNode = {
  id: string;
  title: string;
  tier: "micro" | "relationship" | "rumor" | "arc" | "canon" | "anomaly";
  intensity: number;

  dateWindow?: { from?: string; to?: string };
  identityGate?: string[];
  requiredCharacters?: string[];
  requiredLocationTags?: string[];
  requiredFlags?: string[];
  blockedFlags?: string[];
  requiredClues?: string[];
  relationGate?: Array<{
    target: string;
    minTrust?: number;
    minAffection?: number;
  }>;
  clockGate?: Array<{
    clockId: string;
    min?: number;
    max?: number;
  }>;

  cooldownTurns: number;
  repeatable: boolean;
  priority: number;

  hook: string;
  dramaticQuestion: string;
  conflict: string;
  fixedFacts: string[];
  variableOutcomes: string[];

  stateEffectsHint?: {
    addFlags?: string[];
    addClues?: string[];
    relationTargets?: string[];
    tickClocks?: string[];
  };

  ragHints?: {
    forceEntityIds?: string[];
    forceEntryIds?: string[];
    forceLocationTags?: string[];
  };
};
```

### 节点示例：春日注意到玩家

```ts
{
  id: "haruhi_notices_player",
  title: "春日注意到玩家",
  tier: "micro",
  intensity: 35,
  dateWindow: { from: "2002-04-08", to: "2002-04-20" },
  identityGate: ["passerby", "fringe"],
  requiredCharacters: ["haruhi"],
  requiredLocationTags: ["north_high"],
  requiredFlags: ["entrance_day"],
  blockedFlags: ["haruhi_has_noticed_player"],
  cooldownTurns: 4,
  repeatable: false,
  priority: 70,
  hook: "春日注意到玩家刚才看了她好几眼。",
  dramaticQuestion: "玩家能不能继续维持普通路人姿态？",
  conflict: "玩家想旁观，春日不喜欢别人只是旁观。",
  fixedFacts: [
    "入学日宣言照常发生。",
    "阿虚仍坐在春日前方。",
    "玩家不能取代阿虚的位置。"
  ],
  variableOutcomes: [
    "春日记住玩家。",
    "玩家暂时躲开但留下印象。",
    "阿虚注意到玩家的反应。"
  ],
  stateEffectsHint: {
    addFlags: ["haruhi_has_noticed_player"],
    relationTargets: ["haruhi", "kyon"],
    tickClocks: ["sos_involvement", "haruhi_attention"]
  },
  ragHints: {
    forceEntityIds: ["haruhi", "kyon"],
    forceLocationTags: ["north_high_classroom"]
  }
}
```

### 节点层级

| tier | 作用 | 示例 |
|---|---|---|
| micro | 小钩子，打破流水账 | 某人看了玩家一眼、传单塞到桌上 |
| relationship | 人际推进 | 阿虚吐槽、春日使唤玩家、长门递书 |
| rumor | 世界远处在动 | 走廊八卦、社团传闻、老师谈话 |
| arc | 中期事件链阶段 | SOS 招募、棒球准备、电影拍摄 |
| canon | 原作节点 | 入学宣言、SOS 成立、消失日 |
| anomaly | 异常苗头 | 光线不对、时间错位、某人消失一瞬 |

## 事件触发评分

当前 `decideEvent()` 可以保留外壳，但内部从概率表升级为评分。

### 优先级规则

```text
1. 到期 canon main_line 最高优先级。
2. activeChain 未结束时优先推进当前 chain。
3. 平淡度过高时强制挑 micro / relationship / rumor。
4. 状态危机达到阈值时挑 anomaly / supernatural。
5. 否则在合格 storylets 中按评分选择。
```

### 评分公式

```text
score =
  basePriority
  + dateScore
  + locationScore
  + characterScore
  + identityScore
  + playerActionScore
  + relationScore
  + clockScore
  + blandnessBoost
  + varietyBoost
  - cooldownPenalty
  - repetitionPenalty
  - canonConflictPenalty
```

建议初始权重：

| 项 | 分数 |
|---|---:|
| basePriority | 0 到 100 |
| dateScore | 0 到 30 |
| locationScore | 0 到 25 |
| characterScore | 0 到 25 |
| identityScore | 0 到 20 |
| playerActionScore | 0 到 30 |
| relationScore | 0 到 20 |
| clockScore | 0 到 30 |
| blandnessBoost | 0 到 50 |
| varietyBoost | 0 到 15 |
| cooldownPenalty | 0 到 80 |
| repetitionPenalty | 0 到 40 |
| canonConflictPenalty | 0 到 999 |

### 不要完全确定性

为了避免每次都走同一条最高分，可以在前 3 到 5 个候选中加权随机：

```text
topCandidates = candidates.sort(score).slice(0, 5)
pick weighted random by score
```

这能保持可控，又不死板。

## 平淡度检测

平淡度检测不判断“文笔好坏”，只判断“剧情有没有推进”。

### BlandnessScore

取值 0 到 100。

```text
0 到 30：正常，不干预。
31 到 60：偏平，提高 micro / relationship 权重。
61 到 80：明显平，强制插入小冲突、误会、传闻或角色主动反应。
81 到 100：严重流水账，本轮必须触发 storylet，禁止继续纯环境描写。
```

### 加分项

| 条件 | 加分 |
|---|---:|
| 连续 2 批无 `relationUpdates` | +12 |
| 连续 2 批无 `addFlags / addClues` | +12 |
| 连续 2 批 choices 都偏空泛 | +10 |
| 同一地点停留超过 3 批且没有新角色主动反应 | +10 |
| 最近正文环境描写占比过高 | +8 |
| 最近正文只有“观察、坐下、听见、想了想”但无后果 | +10 |
| 最近没有未解决钩子 | +8 |
| 最近没有任何 clock tick | +8 |
| 玩家选择后下一批没有体现差异 | +15 |

### 扣分项

| 条件 | 扣分 |
|---|---:|
| 新角色主动搭话 | -15 |
| 关系变化 | -15 |
| 新 flag 或 clue | -15 |
| 地点切换 | -10 |
| canon 或 storylet 正在展开 | -20 |
| 出现明确小钩子 | -12 |
| choices 有明显不同行动路径 | -10 |

### 重要边界

安静不等于平淡。

以下内容是低强度张力，不应被误判：

- 教室突然安静。
- 某人停顿半秒。
- 走廊传来一句不完整的话。
- 春日看了玩家一眼。
- 阿虚叹气但没有解释。
- 长门递来一本书但不说明理由。

真正平淡是：

```text
没有目标，没有阻碍，没有变化，没有后果，没有下一拍。
```

## Progress Clocks

长期剧情建议用进度钟表示。它们比直接跳事件自然，也容易调试。

### Clock 类型

```ts
type NarrativeClock = {
  id: string;
  label: string;
  value: number;
  max: number;
  direction: "up" | "down";
  visibleToPlayer: boolean;
  tags: string[];
  onFilledStoryletIds: string[];
};
```

### 初始建议

| clock | max | 用途 |
|---|---:|---|
| `haruhi_attention` | 4 | 春日是否注意到玩家 |
| `sos_involvement` | 6 | 玩家卷入 SOS 团程度 |
| `class_rumor_heat` | 4 | 班级/走廊流言热度 |
| `anomaly_pressure` | 8 | 异常事件压力 |
| `nagato_attention` | 6 | 长门是否开始观察玩家 |
| `kyon_trust` | 6 | 阿虚是否把玩家当作同伴 |
| `canon_scene_progress` | 5 | 当前 canon 场景慢镜头展开进度 |
| `blandness_recovery` | 3 | 平淡修复中的缓冲，避免连续强插事件 |

### Clock tick 来源

```text
玩家主动接近某角色
某角色主动回应玩家
玩家选择调查线索
storylet 发生
canon 场景推进
平淡度过高触发小事件
春日满足度或世界稳定度变化
```

当 clock 满时，不直接让 LLM 自由发挥，而是解锁对应 storylet。

## Prompt 注入结构

推荐每轮 prompt 顺序：

```text
1. 文风层
   只管怎么写，不写剧情事实。

2. 最小 POV 层
   当前玩家是谁，第一人称，玩家代理权。

3. RAG 命中资料
   当前在场角色、地点、世界事实、事件资料。

4. 近期历史
   保留最近 4 到 8 个 beat，过长则用 summary。

5. Runtime State
   日期、身份、关系、flags、clues、clocks、activeArc。

6. Plot Governor 钩子
   本轮钩子、冲突、不可改变、可变结果、强度目标。

7. 输出协议
   最小接口契约，尽量短。

8. 当前玩家行动
```

其中 Runtime State 和 Plot Governor 应靠近末尾，类似 SillyTavern Author's Note 的位置。

## 元数据更新

目前 `stateChanges` 可以继续使用，但建议逐步扩展。

### 短期可加字段

```ts
type StateChanges = {
  haruhiSatisfactionDelta?: number;
  worldStabilityDelta?: number;
  playerStressDelta?: number;
  addClues?: string[];
  addFlags?: string[];
  removeFlags?: string[];
  relationUpdates?: RelationUpdate[];
  identityShift?: IdentityLevel;

  // 新增建议
  tickClocks?: Array<{ id: string; delta: number; reason?: string }>;
  openedThreads?: string[];
  resolvedThreads?: string[];
  locationShift?: string;
  sceneCastAdd?: string[];
  sceneCastRemove?: string[];
  storyletResult?: {
    id: string;
    outcome: string;
  };
};
```

### 权威校验

LLM 输出的 metadata 不能直接全信。代码应做校验：

- `identityShift` 必须满足身份规则。
- `triggeredCanonEvents` 只能由代码写。
- `clock` 不能超过范围。
- `relationUpdates` 单次变化应限制幅度。
- `storyletResult.id` 必须是当前 activeStorylet。
- 不允许 LLM 添加和原作冲突的 flag。

## 分阶段施工计划

### 第 1 阶段：文档与数据类型

目标：不影响运行，先把概念落地。

改动：

- 新增 `RagEntry` / `StoryletNode` / `NarrativeClock` 类型。
- 不接入运行流程。
- 写 5 到 10 个样例 storylet。

验证：

- `npm run typecheck`。
- 单元测试或简单函数测试：样例数据能被类型接受。

### 第 2 阶段：角色卡 RAG 化转换器

目标：角色卡可以厚，但运行时拆片段。

改动：

- 新增 `cardToRagEntries(card)`。
- 先拆当前玩家卡，不拆全部 NPC。
- 将拆出的条目与现有 lorebook 合并。

边界：

- 不改变原角色卡存储格式。
- 不删除现有角色卡字段。
- 不改变 UI。

验证：

- 调试面板显示命中的 RAG 条目。
- 用一个厚角色卡测试，每轮只命中核心 POV + 当前必要片段。

### 第 3 阶段：确定性 RAG Selector

目标：世界书不只靠关键词。

改动：

- 在 `selectLoreEntries` 外层加新 selector，支持：
  - `sceneCast`
  - `locationTags`
  - `activeChain`
  - `dateWindow`
  - `identityGate`
  - `flagsRequired`
  - `relationGate`
- 关键词规则继续保留。

验证：

- 场景里有“凉宫春日”时，即使玩家输入没写春日，也命中春日人设。
- 在文艺部部室时，命中部室和 SOS 团条目。
- 路人身份不会命中超自然真相条目。

### 第 4 阶段：Storylet 节点库

目标：从“事件类型”变成“具体剧情钩子”。

改动：

- 新增 `src/data/storylets.ts`。
- 先写 15 个节点：
  - 入学日 5 个 micro/relationship。
  - SOS 初期 5 个 micro/relationship。
  - 通用校园 rumor 3 个。
  - 异常苗头 2 个。

验证：

- 给定 WorldState，能筛出合格 storylets。
- 不满足 flag/date/identity 的节点不会出现。

### 第 5 阶段：Plot Governor

目标：替代纯概率事件触发。

改动：

- 在 `eventTrigger.ts` 中保留 canon 优先逻辑。
- 加 `selectStoryletForTurn()`。
- 输出 `PlotDecision`。
- Prompt trace 显示选择原因。

边界：

- Canon main_line 仍最高优先级。
- activeChain 仍优先推进。
- 如果没有合格 storylet，回退现有概率逻辑。

验证：

- 入学日第一批必定能选 canon focus。
- canon 之后能选符合起点的 micro storylet。
- cooldown 生效，同一节点不会连续出现。

### 第 6 阶段：平淡度检测

目标：连续流水账时自动插入钩子。

改动：

- 新增 `calculateBlandness(history, state)`。
- 结果进入 `PlotDecision`。
- blandness 高时提高 storylet 权重。
- trace 显示 blandnessScore 和触发原因。

验证：

- 构造 3 批无状态变化历史，分数升高。
- 构造有关系变化/新线索历史，分数下降。
- 高分时优先选择 micro/relationship。

### 第 7 阶段：Progress Clocks

目标：长期剧情可控推进。

改动：

- 在 `WorldState` 中增加 `clocks`。
- `applyTurn` 支持 `tickClocks`。
- storylet gate 支持 clock 条件。

验证：

- `haruhi_attention` 满后解锁“春日正式记住玩家”节点。
- `anomaly_pressure` 满后解锁异常苗头。
- clock 不会超过 max。

### 第 8 阶段：提示词收口

目标：减少乱命令，增强权威顺序。

改动：

- Prompt 中新增 `[Plot Governor]` 块。
- Runtime State 简化成结构化短文本。
- 世界书命中资料按 token budget 排序。
- 输出协议保持最小。

验证：

- Prompt trace 能看见：
  - 命中 RAG 条目。
  - activeStorylet。
  - blandnessScore。
  - active clocks。
- LLM 输出更少纯流水账。

## 黑客松优先落地建议

时间紧时只做这四件：

```text
1. 角色卡拆 RAG 条目。
2. sceneCast 强制激活角色人设。
3. 写 10 个 storylet。
4. 加规则版 blandnessScore，并让它提高 storylet 权重。
```

这四件完成后，效果会比继续加大 prompt 更明显。

## 可验证标准

### 角色卡 RAG

- 给一张 3000 字角色卡，最终 prompt 不应每轮注入完整 3000 字。
- 当前 POV 核心信息必须每轮注入。
- 当前在场 NPC 的核心人设必须注入。

### 世界书

- `sceneCast` 有春日时，春日条目命中。
- 当前地点是部室时，部室条目命中。
- 路人身份下，超自然真相不命中。

### 事件触发

- canon 到期时，canon 事件优先。
- 同一 storylet 受 cooldown 限制。
- 玩家行动应影响下一轮候选，例如“主动搭话”提高 relationship 节点权重。

### 平淡度

- 连续 3 批无关系、无线索、无 flag，分数应超过 60。
- 出现新角色主动反应后，分数应下降。
- 高平淡度时，Plot Governor 不应继续选择纯 daily 描写。

### 长期推进

- clock tick 后能在状态面板或 trace 中看到变化。
- clock 满后能解锁对应 storylet。
- 重载存档后 clocks 不丢失。

## 与现有文件的对应关系

| 现有文件 | 后续角色 |
|---|---|
| `src/types/worldState.ts` | 增加 clocks、activeStorylet、locationTags 等运行状态 |
| `src/types/lorebook.ts` | 扩展 `extensions`，兼容 RAG gate |
| `src/data/lorebooks/hsuzumiya_lore.ts` | 继续作为主世界书，逐步补 tags/entityIds |
| `src/data/canonTimeline.ts` | canon event 同时作为 storylet 最高优先级来源 |
| `src/data/eventChains.ts` | 中期 arc 定义，后续拆 stage |
| `src/lib/eventTrigger.ts` | 升级为 Plot Governor 入口 |
| `src/lib/promptRouter.ts` | 接收 RAG selector 输出与 PlotDecision |
| `src/lib/summary.ts` | 继续负责自然语言压缩，但不作为唯一权威 |
| `src/components/StatusPanel.tsx` | 调试显示 RAG 命中、storylet、平淡度、clocks |

## 最终判断

这套改造的关键不是让模型读更多，而是让模型每轮读得更准。

最重要的三条原则：

```text
角色卡可以厚，注入必须按需。
世界书负责资料，Plot Governor 负责剧情时机。
平淡度检测不是强行制造大事，而是在无变化时补一个有后果的小钩子。
```

做到这一步后，项目会从“LLM 自己续写故事”变成“系统调度互动轻小说，LLM 负责文笔”。这才是更稳、更容易调、更接近成熟互动叙事系统的方向。
