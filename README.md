# Haruhi Text Adventure

<p align="center">
  <strong>AI 驱动的校园异常互动小说原型</strong>
</p>

<p align="center">
  <code>Vite</code> · <code>React</code> · <code>TypeScript</code> · <code>DeepSeek</code> · <code>SillyTavern Preset</code>
</p>

---

## 项目介绍

**Haruhi Text Adventure** 是一个校园异常互动小说原型。玩家通过点击阅读、选项和自由输入推进剧情，系统会在日常和异常事件之间动态调度，让故事既有味道，也不容易跑飞。

这个项目的重点不是“接个 LLM 就完事”，而是做了一套轻量的叙事编排层：

> **代码负责选资料、控剧情、管节奏、拆输出；LLM 负责把当前这一幕写好看。**

---

## 主要功能

| 功能 | 说明 |
| --- | --- |
| **点击式阅读** | 生成一批正文后拆成小段，玩家逐段推进 |
| **选项 + 自由输入** | 既能稳定演示，也保留玩家临场发挥 |
| **LLM 设置面板** | 支持 OpenAI 兼容接口、DeepSeek、Mock 演示模式 |
| **SillyTavern 预设导入** | 可导入酒馆 Chat Completion preset，用自然正文模式接管文风 |
| **角色卡 / 世界书 / 原作时间线** | 按需注入，不再每轮无脑塞全量设定 |
| **调试面板** | 展示当前 prompt 模式、命中的资料、剧情调度、平淡度和 warning |

---

## 技术亮点

### **提示词编排**

把一次生成拆成多层处理：

```text
玩家输入 -> 剧情调度 -> RAG 资料选择 -> Prompt 构建 -> LLM 生成 -> 正文拆分 -> 状态更新
```

比单纯堆 prompt 更容易调试，也更不容易让模型忘记关键规则。

### **RAG 资料系统**

角色卡、世界书、地点、原作事件统一整理成可检索资料。当前场景里出现的角色会被强制注入核心人设，避免“人在场但模型没拿到资料”的问题。

### **Plot Governor**

剧情不完全交给模型自由发挥。系统会先决定本轮该偏日常、角色互动、主线节点还是异常苗头，再把这个意图传给模型，让故事更稳。

### **平淡度检测**

如果连续几轮都没有关系变化、线索变化或有效行动，系统会提高小事件和角色互动的权重，减少“我看了看、我想了想、继续等”的流水账。

### **SillyTavern 兼容**

实现了轻量酒馆 preset 运行时，支持 prompt_order、marker、宏、regex 和采样映射。社区里调好的文风预设可以直接接入，不用从零写提示词。

---

## 技术栈

| 分类 | 技术 |
| --- | --- |
| **前端** | Vite + React + TypeScript |
| **LLM 接口** | OpenAI-compatible Chat Completions API |
| **模型适配** | DeepSeek / Mock |
| **本地存储** | localStorage |
| **提示词系统** | RAG Selector / Plot Governor / Story Adapter |
| **酒馆兼容** | SillyTavern preset compiler |

---

## 运行项目

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

浏览器打开：

```text
http://localhost:5173
```

类型检查和构建：

```bash
npm run typecheck
npm run build
```

---

## 使用方式

1. 打开右上角 **LLM 设置**。
2. 选择 **Mock 模式** 可直接演示；选择 **OpenAI 兼容模式** 可接 DeepSeek 等服务。
3. 如需测试酒馆文风，导入 **SillyTavern preset JSON**，并切换到 **酒馆模式：Preset 自然正文**。
4. 回到主界面，选择起点和角色后开始互动。

---

## 核心思路

```text
RAG 管“能写什么”
Plot Governor 管“现在该发生什么”
平淡度检测管“别一直没事发生”
LLM 负责“把这一幕写好看”
```

**这就是本项目和普通聊天套壳最大的区别。**
