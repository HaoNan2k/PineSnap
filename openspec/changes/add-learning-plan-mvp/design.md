# Design: Learning Plan MVP（文本计划 + 右侧交互）

## 目标

以最小成本跑通“澄清 → Plan → 交互”的学习流程，验证 Plan 模式的用户体验，不引入数据库改动与结构化 UI。

## 关键概念

- **Learning Session**：学习会话容器，使用 `resourceId` 作为 MVP 标识
- **Plan**：由模型生成的 Markdown 文本，描述学习目标与步骤
- **交互区**：右侧文本面板 + 输入框，用于 Plan 后的对话推进

## 状态机（MVP）

1. **idle**：用户进入 `/learn/[resourceId]`
2. **clarifying**：生成 3 个澄清问题（文本）
3. **planning**：根据答案生成 Plan（Markdown）
4. **interacting**：进入文本对话（右侧交互区）

> MVP 中允许将 2/3 合并为一次模型调用（直接产出 Plan + 澄清问答），但默认分两步以便未来扩展。

## 数据结构（内存态）

仅定义概念结构，MVP 不落库：

- `LearningSession`
  - `resourceId`: 来源素材（MVP 唯一标识）
  - `phase`: idle | clarifying | planning | interacting
  - `clarifyQuestions`: string[]（长度 3）
  - `planText`: string（Markdown）
  - `messages`: { role: "user" | "assistant"; content: string }[]

## API 交互（概念层）

> **⚠️ 已废弃（Superseded）**：本提案中的 `POST /api/learn/clarify` 和 `POST /api/learn/plan` 已被 **`optimize-learning-auth-ssr`** 变更中的 tRPC procedures（`learning.generateClarify`、`learning.generatePlan`）取代。实现阶段 MUST 以新变更为准。

- `POST /api/learn/clarify`（已废弃，请使用 `learning.generateClarify` tRPC procedure）
  - 输入：`resourceId`
  - 输出：澄清问题文本（3 条）

- `POST /api/learn/plan`（已废弃，请使用 `learning.generatePlan` tRPC procedure）
  - 输入：`resourceId`, `answers`
  - 输出：Plan Markdown 文本

- `POST /api/learn/chat`
  - 输入：`resourceId`, `message`
  - 输出：assistant 文本回复（Markdown）

## AI 调用策略

- MVP 允许非流式调用（一次性返回文本）
- 模型输出以纯文本为主，Markdown 仅用于层次结构与可读性
- 计划阶段的系统提示应强调“Plan 是可执行的步骤清单”

## UI 布局（MVP）

- 左侧为 **Plan View**，展示 Plan Markdown（空态时显示占位提示）
- 右侧为 **交互区**，展示文本与输入框
- 不复用现有 Chat Sidebar 与历史列表

## 阶段与视图映射（MVP）

### idle
- 左侧：Plan View 空态（提示“计划尚未生成”）
- 右侧：提示“开始学习”与 Start 操作

### clarifying
- 左侧：Plan View 仍为空态
- 右侧：展示 3 条澄清问题文本与输入框

### planning
- 左侧：渲染 Plan Markdown
- 右侧：输入框可用

### interacting
- 左侧：Plan Markdown 保持展示
- 右侧：AI 自动发送第一条消息并进入对话（你一句 / AI 一句）+ 输入框

## 约束

- 不修改 Prisma schema
- 不引入 Chat Conversation/Message 的既有路由与历史逻辑
