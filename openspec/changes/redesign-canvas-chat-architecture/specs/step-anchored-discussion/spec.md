## ADDED Requirements

### Requirement: Discussion conversation is independent from canvas conversation
系统 SHALL 为每个 learning 维护两条独立的 Conversation：一条 `kind=canvas`（学习主线），一条 `kind=chat`（讨论伴学）。两条 conversation 在 DB 层完全隔离，不共享 message 行。

#### Scenario: Learning 持有两条 conversation
- **WHEN** 用户首次访问一个 learning
- **THEN** 系统 MUST 确保该 learning 关联恰好一条 `kind=canvas` Conversation
- **AND** 用户首次提问时 MUST 懒创建恰好一条 `kind=chat` Conversation 并关联

#### Scenario: 不同 conversation 的 message 不混淆
- **WHEN** 服务端接收 `/api/learn/chat` 的请求
- **THEN** 写入的 message MUST 落在 `kind=canvas` 的 Conversation 上
- **WHEN** 服务端接收 `/api/learn/discussion` 的请求
- **THEN** 写入的 message MUST 落在 `kind=chat` 的 Conversation 上

### Requirement: Discussion messages carry anchor metadata
系统 SHALL 为每条 chat conversation 的 message 记录其发起时用户所在的 canvas step。每条 chat message MUST 通过 `anchoredCanvasMessageId` 字段引用 canvas conversation 中**最新一条** assistant message（即用户提问那一刻所在的 step）。

**Anchor 在本期是元数据**，不影响默认 UI 显示和 AI context 注入；保留它为未来可能的 filter / 分析功能。

#### Scenario: 用户在某 step 提问时锚定该 step
- **WHEN** 用户当前 canvas latest step 对应 assistant message id `M`
- **AND** 用户通过 sidebar 提交一条 discussion 请求
- **THEN** 请求体 MUST 携带 `anchorMessageId: M`（**客户端 freeze**，不让服务端重推断）
- **AND** 服务端 MUST 把该提问及对应 AI 回复的 `anchoredCanvasMessageId` 设为 `M`

#### Scenario: 翻看历史时提问仍 anchor 到 latest
- **WHEN** 用户在 canvas 上翻 previous 看历史 step（displayedStepIndex < latestStepIndex）
- **AND** 用户在 sidebar 提交提问
- **THEN** anchor MUST 仍是 latest step 的 assistant message id（不是 displayed 的）
- **AND** 表达"用户在最新 step 状态下临时回看时提的问"

### Requirement: Anchor integrity is enforced at write time
系统 SHALL 在写入 chat message 时校验 anchor 完整性。校验失败的写入 MUST 失败并报错。

#### Scenario: anchor 必须指向同 learning 的 canvas conversation
- **WHEN** `createDiscussionMessage` 接收 `anchorMessageId`
- **THEN** 系统 MUST 校验该 message 所属 conversation 的 kind 为 `canvas`
- **AND** 该 canvas conversation 与目标 chat conversation 必须属于同一 learning
- **AND** 任一条件不满足 MUST 抛错（5xx），不允许写入

#### Scenario: anchor 必须指向 assistant message
- **WHEN** `createDiscussionMessage` 接收 `anchorMessageId`
- **THEN** 系统 MUST 校验该 message 的 role 为 `assistant`
- **AND** 不满足时抛错

#### Scenario: anchor 必须指向未软删的 message
- **WHEN** `createDiscussionMessage` 接收 `anchorMessageId`
- **THEN** 系统 MUST 校验该 message 的 `deletedAt IS NULL`
- **AND** 不满足时抛错（防止 chat anchor 写到未来可能被清理的 canvas message 上）

### Requirement: Frontend handles dangling anchor gracefully
若 chat message 的 anchor 指向的 canvas message 后来被软删（运营操作或脚本清理），UI SHALL 仍能正常显示该 chat message（不报错），仅以"无 anchor"形式呈现。

#### Scenario: anchor 找不到时降级显示
- **WHEN** 前端读取 chat message 列表
- **AND** 某条 message 的 `anchoredCanvasMessageId` 在当前 canvas messages 中找不到（被软删）
- **THEN** 该 message MUST 仍正常渲染
- **AND** 该 message 的 anchor 元数据 MUST 视为 null（不显示 disclosure 小字）

### Requirement: Discussion messages show anchor step disclosure
UI SHALL 在 sidebar 内每条 user message 旁显示一个轻量 disclosure（如"在 step N 时问的"小字 / hover tooltip），帮助用户在跨 step 引用时定位上下文。

**理由**：cross-stream race（用户提问的瞬间 canvas 正好推进到下一步）会让 anchor 元数据"看起来不对"。显式 disclosure 让这种 race 至少有 user-visible 线索可排查；同时帮助用户回顾"我当时在哪一步问的"。

#### Scenario: user message 显示 anchor 标签
- **WHEN** sidebar 渲染一条 user 角色的 chat message
- **AND** 该 message 的 anchor 指向某个有效 canvas message
- **THEN** UI MUST 在该 message 旁显示一个轻量标签（小字、低对比度），形如 "在 step N 时问的"，N 是 anchor 对应的 canvas step 序号
- **AND** 标签 MUST 不抢主信息流的视觉权重

### Requirement: Discussion AI endpoint is isolated from canvas AI
系统 SHALL 通过独立的 `/api/learn/discussion` endpoint 处理讨论请求，与 canvas 的 `/api/learn/chat` 完全分离。讨论 endpoint MUST NOT 接受任何 tool 参数；模型物理上无法调用 tool。

#### Scenario: discussion endpoint 不传 tools
- **WHEN** 服务端调用 `streamText` 处理 discussion 请求
- **THEN** `tools` 参数 MUST 为 `undefined` 或空对象
- **AND** AI 的输出 MUST 仅包含 text part

#### Scenario: discussion endpoint 使用独立 system prompt
- **WHEN** 构建 discussion 请求的 messages 数组
- **THEN** system prompt MUST 来自 `lib/learn/prompts/discussion-system-prompt.ts`，不复用 canvas 的 prompt

### Requirement: Discussion AI sees full chat history and canvas map
系统 SHALL 在 discussion endpoint 调用 LLM 时注入：完整 chat conversation 历史（所有 message，无 anchor 过滤）+ canvas conversation 的 step 地图摘要（每 step 的题目主题）。

#### Scenario: 注入完整 chat history
- **WHEN** discussion endpoint 处理请求
- **THEN** messages 数组 MUST 包含该 chat conversation 的全部历史 message（按 createdAt asc）
- **AND** MUST NOT 按 anchor 过滤

#### Scenario: 注入 canvas history 地图
- **WHEN** discussion endpoint 处理请求
- **THEN** system prompt MUST 包含 canvas 全 step 的简要地图（每 step 的题目主题，如"step 3: RLS 行级安全"）
- **AND** MUST NOT 把 canvas tool args 全文注入（控成本）

#### Scenario: 监控 token 成本
- **WHEN** discussion 请求处理完毕
- **THEN** 服务端 MUST 记录日志包含：`chatHistoryMessageCount` 与 `totalContextTokens`（估算）
- **AND** 用于后续观察是否需要加 token 优化策略

### Requirement: Discussion AI cannot affect canvas progression
系统 SHALL 保证 discussion AI 的回复永远不会改变 canvas conversation 的状态。Discussion 的输出 MUST 仅写入 `kind=chat` 的 Conversation。

#### Scenario: Discussion 输出仅写入 chat conversation
- **WHEN** discussion AI 完成回复
- **THEN** 系统 MUST 将 message 写入 `kind=chat` 的 Conversation
- **AND** 系统 MUST NOT 触发任何 canvas conversation 的写入

#### Scenario: Discussion AI 的指令性内容不被执行
- **WHEN** discussion AI 在文本中说类似"我已经为你点了下一题"或试图模拟 tool call 输出
- **THEN** 系统 MUST 忽略此类指令性表述（仅作为文本展示）
- **AND** canvas 状态 MUST 保持不变
