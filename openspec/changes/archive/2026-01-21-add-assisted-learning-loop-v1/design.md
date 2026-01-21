# Design: Assisted Learning Loop（V1）

## 设计目标

- **最小可用闭环**：`Resource`（采集入库）→ 素材（列表）→ Learn Focus（卡片学习）
- **低复杂度**：V1 不引入学习状态/进度/持久化；不改 Prisma schema
- **布局清晰**：用 Next.js App Router 的路由组/布局隔离 Main 与 Focus 的 UI 外壳
- **符合 UI 设计稿**：Learn Focus 顶部极简 Header；学习区域左上角 X 退出

## 术语

- **Resource**：采集落库的素材实体（PostgreSQL `jsonb` 存 payload）
- **素材**：展示所有 `Resource` 的列表入口（V1 为全量列表）
- **学习**：独立页面入口（V1 占位，不要求完整功能）
- **知识**：独立页面入口（V1 占位，不要求完整功能）
- **Learn Focus**：专注学习页面（不显示 Sidebar），呈现卡片式学习交互

## 路由与布局（Main vs Focus）

### Main（带 Sidebar 的全局布局）

- **目的**：承载“浏览/管理/切换资源”的页面，保持全局导航稳定存在
- **页面**：
  - `/sources`
  - `/learning`（V1 占位）
  - `/notes`（V1 占位）
- **UI 外壳**：
  - Sidebar：包含 素材 / 学习 / 知识 三个入口
  - 内容区：渲染对应页面内容

### Focus（无 Sidebar 的专注布局）

- **目的**：承载学习过程，避免导航干扰；学习体验更接近“练习模式”
- **页面**：
  - `/learn/[resourceId]`
- **UI 外壳（与提供的 HTML 对齐）**：
  1) 顶部 **极简 Header**（品牌/状态信息可选）
  2) 下侧为整片学习区域（卡片）
  3) 学习区域左上角有一个小叉号（X），用于退出 Focus

### 根入口

- `/` SHALL 重定向到 `/sources`（V1 的产品入口以 素材 为主）

## Learn Focus：状态机（V1）

> V1 不落库学习过程，仅在客户端保持运行时状态。

### 状态

- `idle`：初次进入 Learn 页面，尚未开始
- `generating`：用户点击 Start 后，正在请求生成第一张卡片
- `question`：展示问题卡片
- `feedback`：展示反馈卡片（若 V1 暂不做反馈页，则可在 question 内联展示反馈块）

### 关键交互

- **Start**
  - 用户 MUST 显式点击 Start 才触发生成接口
  - 设计意图：为后续“学习意图澄清”（例如“你想学什么/你希望达到什么目标”）留出入口

- **Exit（X）**
  - Learn 页面学习区域左上角的 X MUST 可见
  - 点击 X MUST 退出 Focus 并返回 `/sources`

## 数据与服务端边界（V1）

- 素材列表数据来自 `Resource`（服务端为真相源）
- Learn Focus 的卡片生成在 V1 可以只依赖：
  - `resourceId`（用于定位素材）
  - 可选：Start 阶段的用户意图输入（V1 可先不做，仅预留）
- V1 不新增任何学习相关持久化字段/表

## 与既有规范的关系

- 本变更引入新的 IA 与路由（`/sources`、`/learning`、`/notes`、`/learn/[resourceId]`、`/` 重定向目标变化）
- 采集仍遵循既有 `content-capture`：采集只创建 `Resource`，不隐式创建会话
- 鉴权仍遵循既有 `auth`：身份由服务端解析，客户端不得注入 userId

