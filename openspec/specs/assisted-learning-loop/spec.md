# assisted-learning-loop Specification

## Purpose
TBD - created by archiving change add-assisted-learning-loop-v1. Update Purpose after archive.
## Requirements
### Requirement: Main vs Focus layouts MUST be separated by route group layouts
系统 SHALL 将“浏览/管理类页面”与“专注学习页面”使用不同的 Layout 外壳进行隔离，以避免在同一布局内通过条件渲染隐藏导航导致状态分裂与视觉干扰。

#### Scenario: Main 页面显示全局导航（Sidebar）
- **WHEN** 用户访问 `/sources`、`/learning` 或 `/notes`
- **THEN** 页面 MUST 使用 Main Layout
- **AND** Main Layout MUST 渲染全局 Sidebar（包含 素材/学习/知识 入口）

#### Scenario: Focus 页面不显示 Sidebar
- **WHEN** 用户访问 `/learn/[resourceId]`
- **THEN** 页面 MUST 使用 Focus Layout
- **AND** Focus Layout MUST NOT 渲染 Sidebar

### Requirement: Root route MUST redirect to /sources in V1
系统 SHALL 将根路径作为 V1 的产品入口，并将其重定向到 素材页。

#### Scenario: Root redirects to Sources
- **WHEN** 用户访问 `/`
- **THEN** 系统 MUST 导航到 `/sources`

### Requirement: Sources MUST list Resources as the full collection in V1
系统 SHALL 在 素材页 中展示 `Resource` 的全量列表，作为 V1 的主入口与素材浏览页。

#### Scenario: Sources shows Resource list
- **WHEN** 用户访问 `/sources`
- **THEN** 系统 MUST 渲染 `Resource` 列表
- **AND** V1 定义该列表为“全量资源集合”（实现上 MAY 先以 `bilibili_capture` 为主，但不得改变语义定义）

### Requirement: Notes page MUST exist as a separate route in V1
系统 SHALL 提供独立的 `/notes` 路由入口以承载后续“知识沉淀”的演进，即便 V1 尚未完成具体设计与能力。

#### Scenario: Notes route exists
- **WHEN** 用户访问 `/notes`
- **THEN** 系统 MUST 返回一个可访问页面（占位即可）
- **AND** 页面 MUST 使用 Main Layout（带 Sidebar）

### Requirement: Learning page MUST exist as a separate route in V1
系统 SHALL 提供独立的 `/learning` 路由入口以承载“学习过程/进度管理”的后续演进，即便 V1 尚未完成具体设计与能力。

#### Scenario: Learning route exists
- **WHEN** 用户访问 `/learning`
- **THEN** 系统 MUST 返回一个可访问页面（占位即可）
- **AND** 页面 MUST 使用 Main Layout（带 Sidebar）

### Requirement: Learn Focus MUST implement minimal header and in-area close button
系统 SHALL 在 Learn Focus 页面提供与设计稿一致的基础结构：顶部极简 Header 与学习区域左上角的 X 退出按钮。

#### Scenario: Focus has minimal header and X close
- **WHEN** 用户访问 `/learn/[resourceId]`
- **THEN** 页面顶部 MUST 渲染极简 Header
- **AND** 页面下侧 MUST 渲染学习区域（卡片容器）
- **AND** 学习区域左上角 MUST 渲染一个 X 退出按钮

#### Scenario: Close returns to Sources
- **WHEN** 用户在 `/learn/[resourceId]` 点击学习区域左上角 X
- **THEN** 系统 MUST 返回 `/sources`

### Requirement: Learn generation MUST be triggered only after Start is clicked
系统 SHALL 将“生成卡片”的触发点放在用户点击 Start 之后，以便未来扩展“需求澄清/学习意图选择”步骤。

#### Scenario: No generation before Start
- **WHEN** 用户进入 `/learn/[resourceId]` 且尚未点击 Start
- **THEN** 系统 MUST NOT 调用生成接口

#### Scenario: Start triggers generation and shows first card
- **WHEN** 用户在 `/learn/[resourceId]` 点击 Start
- **THEN** 系统 MUST 调用生成接口以获取第一张学习卡片
- **AND** 页面 MUST 展示该卡片内容

### Requirement: V1 MUST NOT introduce schema changes for learning state/progress
系统 SHALL 在 V1 中保持 Prisma schema 不变，不引入学习状态/进度/归档等持久化字段或表。

#### Scenario: No schema changes
- **WHEN** 本变更进入实现阶段
- **THEN** 实现 MUST NOT 修改 `prisma/schema.prisma` 以引入学习相关字段/表

