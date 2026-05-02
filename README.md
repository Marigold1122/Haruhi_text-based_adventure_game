# 凉宫春日 · 北口高校 — 1.0

AI 驱动的校园 / 异常文字冒险，架构严格按 SillyTavern 生态拼装。

## 跑起来

```bash
npm install
npm run dev
# 浏览器打开 http://localhost:5173
```

第一次进入：右上角「LLM 设置」配置 API（默认 Mock 可直接演示）。
- OpenAI 兼容（OpenRouter / DeepSeek / 本地 vLLM / Ollama / LM Studio）
- Anthropic Messages API
- Mock（无网络，演示用）

类型检查 / 生产构建：

```bash
npm run typecheck
npm run build
```

## 1.0 完成度

按设计文档（〇~十四）逐项落地。

### 内置内容

- **5 张可玩 V2 角色卡**：阿虚 / 凉宫春日 / 长门有希 / 朝比奈实玖瑠 / 古泉一树（每张含 description / personality / scenario / first_mes / 多段 mes_example / system_prompt / post_history_instructions / 口头禅 / 对各成员称呼）
- **NPC 轻量卡**：朝仓凉子 / 阿虚妹妹 / 鹤屋 / 喜绿江美里 / 周防九曜 / 橘京子（按 identity_gate 显形）
- **主世界书 hsuzumiya_lore（30+ 条目）**：基础设定、关键场所、主要人物、超自然真相（身份门控）、关键事件设定（电研社/棒球/孤岛/八月/文化祭/消失/佐佐木对峙）、风格/禁止事项
- **3 个起点**：北高入学日 / SOS 团创立 / 孤岛事件
- **8 个关键事件链元数据**：闭锁空间 / SOS 活动 / 棒球大会 / 孤岛 / 漫无止境的八月 / 文化祭电影 / 消失 / 佐佐木对峙
- **3 + 8 个 Preset**：日常 / 奇遇 / 超自然，加 8 个事件链专属

### 核心架构

按酒馆默认 9 步顺序拼装 prompt（见 `src/lib/promptRouter.ts`）：

1. `[POV] 角色名` + 单视角第一人称约束
2. Preset.system_prompt（事件链中走该链专属 Preset）
3. 角色卡 description / personality / scenario
4. 世界书 constant + 关键词触发（按 insertion_order，区分 before_char / after_char、identity_gate、chain_id）
5. 角色卡 mes_example（few-shot）
6. 完整历史（超长时折叠为 Rolling Summary）
7. Rolling Summary
8. Author's Note：日期 / 流速 / 身份 / 春日满足度 / 世界稳定度 / 关系 / 事件链状态
9. 角色卡 post_history_instructions
10. 当前用户输入 / 时间推进信号

### 系统模块

| 模块 | 文件 |
| --- | --- |
| LLM Provider（OpenAI 兼容 + Anthropic + Mock） | `lib/llmProviders.ts` `lib/settings.ts` `lib/llm.ts` |
| Prompt Router（9 步拼装 + 世界书筛选 + 事件链 Preset 路由） | `lib/promptRouter.ts` |
| 世界状态变量（春日满足度 / 世界稳定 / 关系 / flags） | `lib/worldState.ts` `types/worldState.ts` |
| 时间推进与流速分段 | `lib/timeAdvance.ts` |
| 事件触发（随机数 + 基础概率 + 身份调整 + 早期保护） | `lib/eventTrigger.ts` |
| 事件链（8 个，元数据 + 触发条件 + 状态机骨架） | `data/eventChains.ts` |
| Rolling Summary（超过 24 条折叠为摘要） | `lib/summary.ts` |
| 结局系统（终结概率 + 完整历史小传） | `lib/ending.ts` |
| 随机模式（LLM 生成 V2 卡） | `lib/randomMode.ts` |
| JSON 卡导入 / 导出（含 V1→V2 兼容） | `lib/cardIO.ts` |
| 存档（state + history + summary + custom card） | `lib/storage.ts` |

### UI

- 起点屏：起点 / 视角选择 + LLM 设置 + 随机模式 + JSON 导入
- 主故事屏：消息流（点击推进）+ 选项 + 自定义输入 + 状态侧栏（含 POV / 时间 / 关系 / 线索 / 事件链 / 滚动摘要状态 / 调度调试信息）
- 顶栏：保存 / 读取 / 清除 / 设置 / 回到起点
- 结局屏：盖棺定论调用 LLM 喂完整历史生成小传

## 数据格式严格遵守 SillyTavern V2 spec

- 角色卡：`spec: "chara_card_v2"`，可与社区现成卡互通
- 世界书：`Lorebook` 结构等价于 `character_book`，加扩展字段 `identity_gate` / `chain_id` 做门控
- Author's Note：`{{date}}` / `{{flow}}` / `{{identity}}` / `{{world_state}}` / `{{chain}}` 占位符

## 后续可加的（1.0 不做）

- PNG 嵌入式角色卡读写
- 多存档槽位
- 完整事件链脚本（目前事件链由 LLM 渐进式自规划）
- 立绘 / CG / BGM
- 后端代理（生产部署时把 API key 移出浏览器）
