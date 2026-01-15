# Proposal: Assisted Learning Loop（V1：Sources → Learn Focus）

## Why

将产品体验从“对话优先”调整为“素材/学习优先”，为后续学习沉淀与知识产出建立更清晰的路径与入口。

## What Changes

- 将主导航与入口调整为“素材 / 学习 / 知识”
- 将主入口路由调整为 `/sources`
- 新增 `/learning` 作为学习过程占位入口
- 将“素材列表”与“知识占位页”分离到 `/sources` 与 `/notes`

## 背景与动机

PineSnap 当前以聊天能力为主线（Chat-first），并已具备跨站内容采集落库（`Resource`）与聊天存储/会话能力（`Conversation/Message`）。本次迭代希望将产品体验从“对话优先”转为“素材/学习优先”，以便用户能围绕已采集内容进行更聚焦的学习交互。

V1 的目标是**先把 Bilibili 采集链路跑通**并形成最小学习闭环：

- 采集（Userscript → `POST /api/capture/bilibili`）落库为 `Resource`
- 素材展示 `Resource` 列表
- 点击进入 Learn Focus（专注模式），用户点击 Start 后触发生成，开始卡片式学习交互

## 范围（V1）

### 包含

- **信息架构（IA）**：
  - 素材：展示所有 `Resource` 的全量列表（V1 可先以 `type=bilibili_capture` 为主，但语义定义为“全量资源”）
  - 学习：提供独立页面入口（V1 先占位，不要求完整设计与功能）
  - 知识：提供独立页面入口（V1 先占位，不要求完整设计与功能）
  - Learn Focus：专注学习页面，仅渲染学习卡片与极简 Header

- **路由与布局**：
  - `/` 重定向到 `/sources`
  - `/sources`（Main 布局：带全局 Sidebar）
  - `/learning`（Main 布局：带全局 Sidebar，占位页）
  - `/notes`（Main 布局：带全局 Sidebar，占位页）
  - `/learn/[resourceId]`（Focus 布局：不带 Sidebar，极简 Header + 学习区域）

- **Learn Focus 交互（V1）**：
  - 页面初始为“未开始”状态
  - 用户点击 **Start** 后才触发“生成接口”（后续可在 Start 前增加需求澄清能力）
  - Learn 页面暂时**只展示卡片**（不展示原文 summary/transcript）
  - 学习区域左上角提供一个小叉号（X）用于退出 Focus（返回 `/sources`）
  - 顶部存在一个极简 Header（效果与提供的 HTML 一致）

### 不包含（明确非目标）

- **不改 Prisma schema**（不新增 LearningProgress / CardState / ResourceStatus 等字段或表）
- 不实现“学习进度条/进度计算”
- 不实现 Plant / Prune（以及任何删除/归档/恢复规则）
- 不实现卡片/学习过程的持久化（V1 允许纯运行时状态）
- 不在本次提案中重构现有 Chat 存储与会话路由（Chat 能力保留为既有能力）

## 风险与权衡

- **无进度/无状态**：V1 以“链路跑通”为优先，短期牺牲“知识沉淀”的完整价值。后续可通过 schema 变更引入学习状态与进度。
- **路由形态变化**：`/` 从默认跳转 `/chat` 改为 `/sources`，属于用户入口变化，需在 OpenSpec 中明确并在实现阶段回归验证。

## 验收标准（V1）

- 能通过 Bilibili 采集端点写入 `Resource`
- `/sources` 能展示资源列表（至少包含 `bilibili_capture`）
- 从 `/sources` 进入 `/learn/[resourceId]` 后，页面呈现：
  - 顶部极简 Header
  - 学习区域
  - 学习区域左上角的 X 可退出回到 `/sources`
  - Start 按钮在未开始状态可见；点击 Start 才触发生成并进入第一张学习卡片

