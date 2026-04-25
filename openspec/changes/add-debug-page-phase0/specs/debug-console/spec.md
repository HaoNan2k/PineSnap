## ADDED Requirements

### Requirement: Debug console MUST be admin-only
系统 MUST 仅允许 `app_metadata.role === "admin"` 的 Supabase 用户访问 `/debug` 路由组及 `debug` tRPC namespace 下的所有 procedure。非 admin 用户 MUST 收到明确的拒绝响应。

#### Scenario: Non-authenticated user accesses /debug
- **WHEN** 未登录用户访问 `/debug` 任意子路径
- **THEN** 系统 MUST 重定向到登录页 或 返回 401

#### Scenario: Authenticated non-admin user accesses /debug
- **WHEN** 已登录但 `app_metadata.role !== "admin"` 的用户访问 `/debug` 任意子路径
- **THEN** 系统 MUST 渲染明确的"无权限"页面（HTTP 403），不泄漏内部数据
- **AND** 系统 MUST NOT 返回 learning / message 等业务数据

#### Scenario: Non-admin calls debug tRPC procedure directly
- **WHEN** 已登录非 admin 用户直接调用 `debug.getLearningDetail`
- **THEN** tRPC MUST 抛 `FORBIDDEN` 错误

### Requirement: Debug search MUST support hierarchical resolution
顶栏搜索 MUST 接受三种输入并智能路由：纯 UUID 视为 `learningId` 直接定位、邮箱视为 user 入口、其他作为模糊匹配。

#### Scenario: Search by valid learning UUID
- **WHEN** admin 在搜索框输入合法 UUID 且该 ID 对应一条 `Learning` 记录
- **THEN** 系统 MUST 直接跳转到 `/debug/learning/<id>`

#### Scenario: Search by email
- **WHEN** admin 输入邮箱字符串（匹配 email regex）
- **THEN** 系统 MUST 通过 Supabase admin API 反查 userId
- **AND** MUST 跳转到 `/debug/user/<userId>`

#### Scenario: Search yields no result
- **WHEN** admin 输入字符串既不是 UUID 也不是邮箱，或匹配不到任何记录
- **THEN** 系统 MUST 显示空状态提示，不抛异常

### Requirement: Learning detail page MUST render dual-lane timeline
单 learning 详情页 MUST 以双列泳道呈现 canvas 与 chat 两条 conversation 的消息：左列 canvas、右列 chat，按 `createdAt` 全局对齐。

#### Scenario: Learning has both canvas and chat messages
- **WHEN** admin 进入 `/debug/learning/<id>`，该 learning 同时存在 canvas 与 chat conversation
- **THEN** 系统 MUST 在左列渲染 canvas messages、右列渲染 chat messages
- **AND** 消息卡片的垂直位置 MUST 正比于 `createdAt - earliestCreatedAt`（绝对时间对齐）
- **AND** 每个 chat message 若有 `anchoredCanvasMessageId` MUST 用 SVG 连接线指向左侧对应 canvas message 卡片

#### Scenario: Learning has only canvas conversation (no discussion yet)
- **WHEN** admin 进入只有 canvas 而没有 chat conversation 的 learning
- **THEN** 左列正常渲染、右列显示空状态占位（"暂无讨论消息"）

### Requirement: Message card MUST display raw fields without translation
每条 message 卡片 MUST 完整显示数据库原始字段，禁止把 tool-call / parts 等内容翻译成业务语言。

#### Scenario: Card shows full metadata header
- **WHEN** message 卡片渲染
- **THEN** 卡片 MUST 包含：role 标签、message id（可一键复制）、conversationId 简写（canvas 或 chat 标签）、createdAt 绝对时间戳、相对前一条同列消息的时间差 `Δ +N.Ns`
- **AND** MUST 包含 metadata 行：clientMessageId、anchoredCanvasMessageId、deletedAt（如有则显示）

#### Scenario: Card shows raw parts JSON
- **WHEN** message 卡片渲染 body
- **THEN** `parts` 字段 MUST 以 JSON viewer 渲染（默认折叠 1 层），所有子字段（toolCallId / toolName / input / output / text / file ref / source 等）按原貌呈现，不做中文化或简化

### Requirement: Soft-deleted messages MUST be hidden by default with toggle
系统 MUST 在顶栏提供 "显示已删除" 开关，默认关闭，关闭时 MUST 隐藏 `deletedAt != null` 的消息；开关打开时 MUST 显示这些消息并以视觉差异（灰显 + 划线）标识。

#### Scenario: Toggle off (default)
- **WHEN** "显示已删除" toggle 处于关闭状态
- **THEN** 时间轴 MUST NOT 渲染 `deletedAt != null` 的消息
- **AND** 时间差 Δ 计算 MUST 跳过这些消息

#### Scenario: Toggle on
- **WHEN** admin 打开 toggle
- **THEN** 已删除消息 MUST 渲染并标记为已删除（视觉差异如 opacity ≤ 50% 且 line-through）
- **AND** 已删除消息的 `deletedAt` 时间戳 MUST 在卡片 metadata 行显示

### Requirement: Trace entry point MUST be reserved on each card
每条 message 卡片 MUST 在固定位置（卡片右上角）显示一个 `Trace ↗` 按钮，Phase 0 期间该按钮 MUST 处于 disabled 状态并提供 hover 提示。

#### Scenario: Phase 0 trace button is disabled with hint
- **WHEN** admin 鼠标悬停到 `Trace ↗` 按钮
- **THEN** 系统 MUST 显示提示文本说明 "Trace 链接将在 Phase 1 接入观测平台后启用"
- **AND** 按钮 MUST 不可点击（disabled 状态），不触发任何导航

### Requirement: Learning detail MUST include top metadata card
进入 learning 详情页 MUST 在顶部固定显示一张元信息卡，包含 learning 基础元数据。

#### Scenario: Metadata card rendering
- **WHEN** 详情页加载
- **THEN** 卡片 MUST 显示：learningId（可复制）、关联的 user id 与 email、createdAt / updatedAt / deletedAt、关联 resources 列表（每项含 id 与 title）、`clarify` 字段（折叠的 JSON）、`plan` 字段（折叠的 Markdown，可展开渲染）、两条 conversation 的 id / kind / message 数

### Requirement: Server MUST cap learning detail payload size
`debug.getLearningDetail` procedure MUST 对单次返回的 message 总数设置硬上限（500 条），超过时截断并在响应中标识。

#### Scenario: Learning has fewer than cap
- **WHEN** learning 包含 ≤ 500 条 message（含软删除）
- **THEN** 服务端 MUST 一次性返回所有 message，不分页

#### Scenario: Learning exceeds cap
- **WHEN** learning 含 > 500 条 message
- **THEN** 服务端 MUST 截断到 500 条（按 createdAt 升序保留前 500），并在响应中包含 `truncated: true` 标识
- **AND** 前端 MUST 在页面顶部显示明显警告
