# 凉宫春日 · 北口高校 — 初步样品

AI 驱动的校园 / 异常文字冒险，架构上严格按 SillyTavern 生态拼装。

## 跑起来

```bash
npm install
npm run dev
# 浏览器打开 http://localhost:5173
```

类型检查：

```bash
npm run typecheck
```

## 现在能跑通什么

- 起点选择（北高入学日 / SOS 团刚成立 / 孤岛之夏）
- 视角选择（阿虚 / 春日；起点会自动过滤合法角色）
- 主故事界面：消息流 + 选项 + 自定义输入 + 状态侧栏
- 时间推进与流速切换（沉浸式提示）
- 事件类型路由（日常 / 奇遇 / 超自然事件链）
- Mock LLM 闭环；输出协议为 `<event_json>` 块
- 调度信息面板：当前 Preset、激活的世界书条目（开发可见）

## 架构（按设计文档 0~14 节落点）

```
src/
  types/
    character.ts     # Character Card V2 spec
    lorebook.ts      # SillyTavern World Info（含 identity_gate / chain_id 扩展）
    preset.ts        # System Prompt + 采样参数 + Author's Note 模板
    worldState.ts    # 春日满足度、世界稳定度、关系、事件链状态机
    turn.ts          # StoryTurn 协议（与 <event_json> 一致）
  data/
    characters/      # kyon.ts, haruhi.ts（V2 角色卡）
    lorebooks/       # hsuzumiya_lore.ts（constant + 关键词 + 身份门控 + 事件链子集）
    presets/         # daily / supernatural / encounter
    startingPoints.ts
  lib/
    promptRouter.ts  # 核心：按酒馆 9 步顺序拼 prompt
    worldState.ts    # applyTurn：把 stateChanges 写回 WorldState
    timeAdvance.ts   # 流速分段 + 切换提示
    eventTrigger.ts  # 随机数 + 基础概率（身份/满足度/早期保护）
    llm.ts           # mockLLM + parseEventJson + fallbackTurn
    storage.ts       # 单槽 localStorage 存档（接口预留）
  components/        # StartScreen / StoryView / MessageStream / ChoicePanel / StatusPanel / TopBar
```

## Prompt 拼装顺序（promptRouter.ts）

完全按酒馆默认实现：

1. Preset.system_prompt
2. 角色卡 description / personality / scenario
3. 世界书 constant + 关键词触发命中条目（按 insertion_order，区分 before_char / after_char）
4. 角色卡 mes_example（few-shot）
5. 完整聊天历史 / 历事
6. Rolling Summary（接口预留，超长时启用）
7. Author's Note：世界状态 + 身份 + 流速 + 事件链状态
8. 角色卡 post_history_instructions
9. 当前用户输入 / 时间推进信号

输出：标准 ChatML messages，可直接喂给 OpenAI / Claude / 本地 LLM。开发面板会展示当前 Preset 与命中的世界书条目，方便调试。

## 接真实 LLM

`src/lib/llm.ts` 已留 `realLLM`：

```ts
import { setLLM, realLLM } from "@/lib/llm";
setLLM(realLLM); // 在 main.tsx 启用
```

`realLLM` 内部把 `messages` POST 到你自己的代理（避免在前端泄露 API key）。

## 还没做（已知 todo）

- 真实 API 适配（仅留口）
- PNG 嵌入式角色卡读写
- Rolling Summary 滚动摘要的实际触发
- 完整事件链脚本（目前事件链仅状态机骨架，闭锁空间链由 mock 演示）
- 更多角色卡（长门 / 朝比奈 / 古泉 / 佐佐木）
- 结局系统（盖棺定论调用）
- 社区 V2 卡 / 世界书的导入 UI
