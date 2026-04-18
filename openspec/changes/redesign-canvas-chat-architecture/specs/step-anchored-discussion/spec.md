## ADDED Requirements

### Requirement: Discussion conversation is independent from canvas conversation
系统 SHALL 为每个 learning 维护两条独立的 Conversation：一条 `kind=canvas`（学习主线），一条 `kind=chat`（讨论伴学）。两条 conversation 在 DB 层完全隔离，不共享 message 行。

#### Scenario: Learning 持有两条 conversation
- **WHEN** 用户首次访问一个 learning
- **THEN** 系统 MUST 确保该 learning 同时关联到一条 `kind=canvas` 的 Conversation 与一条 `kind=chat` 的 Conversation
- **AND** 任一 conversation 缺失时 MUST 自动创建并关联

#### Scenario: 不同 conversation 的 message 不混淆
- **WHEN** 服务端接收 `/api/learn/chat` 的请求
- **THEN** 写入的 message MUST 落在 `kind=canvas` 的 Conversation 上
- **WHEN** 服务端接收 `/api/learn/discussion` 的请求
- **THEN** 写入的 message MUST 落在 `kind=chat` 的 Conversation 上

### Requirement: Discussion messages are anchored to canvas steps
系统 SHALL 为每条 chat conversation 的消息标注其讨论所针对的 canvas step。每条 chat message MUST 通过 `anchoredCanvasMessageId` 字段引用 canvas conversation 的某条 assistant message（即一个 step）。

#### Scenario: 用户在某 step 提问时锚定该 step
- **WHEN** 用户在 canvas 当前停留在 step N（对应 canvas conversation 的某条 assistant message id `M`）
- **AND** 用户通过 sidebar 提问
- **THEN** 系统 MUST 将该提问的 chat message 的 `anchoredCanvasMessageId` 设为 `M`
- **AND** 后续的 assistant 回复也 MUST 锚定到同一 `M`

#### Scenario: 切换 step 后锚定切换
- **WHEN** 用户翻 previous 到 step N-1（对应 canvas message id `M-1`）
- **AND** 用户在该 step 提问
- **THEN** 新提问的 chat message MUST 锚定到 `M-1`，不影响 step N 上已有的讨论锚定关系

### Requirement: Discussion AI endpoint is isolated from canvas AI
系统 SHALL 通过独立的 `/api/learn/discussion` endpoint 处理讨论请求，与 canvas 的 `/api/learn/chat` 完全分离。讨论 endpoint MUST NOT 接受任何 tool 参数；模型物理上无法调用 tool。

#### Scenario: discussion endpoint 不传 tools
- **WHEN** 服务端调用 `streamText` 处理 discussion 请求
- **THEN** `tools` 参数 MUST 为 `undefined` 或空对象
- **AND** AI 的输出 MUST 仅包含 text part

#### Scenario: discussion endpoint 使用独立 system prompt
- **WHEN** 构建 discussion 请求的 messages 数组
- **THEN** system prompt MUST 来自 `lib/learn/prompts/discussion-system-prompt.ts`，不复用 canvas 的 prompt

### Requirement: Discussion AI receives canvas context as read-only input
系统 SHALL 在 discussion endpoint 调用 LLM 时注入以下 context：当前 canvas step 的内容、canvas 历史 step 的简要摘要、当前 step 已有的 chat history。Context 注入方式为 inline 在 system prompt 中，模型无法主动获取超出范围的内容。

#### Scenario: 注入当前 step
- **WHEN** discussion endpoint 处理请求
- **THEN** system prompt MUST 包含当前 canvas step 的题目/内容/选项

#### Scenario: 注入历史 step 摘要
- **WHEN** discussion endpoint 处理请求
- **THEN** system prompt MUST 包含 canvas 历史 step 的有序摘要（最少：每步的题目主题）

#### Scenario: 注入当前 step 的 chat 历史
- **WHEN** discussion endpoint 处理请求
- **THEN** messages 数组 MUST 包含锚定到当前 step 的所有 chat history

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

### Requirement: Sidebar discussion view follows current canvas step
UI SHALL 在用户切换 canvas step 时，自动刷新 sidebar 显示的讨论历史为锚定到当前 step 的消息列表。

#### Scenario: 翻 previous 时 sidebar 同步
- **WHEN** 用户在 canvas 翻到 step N-1
- **THEN** sidebar 的 header MUST 显示"关于「step N-1 的题目主题」"
- **AND** sidebar 的滚动区 MUST 显示锚定到 step N-1 的所有 chat messages

#### Scenario: 没有讨论的 step 显示空状态
- **WHEN** 用户翻到的 step 没有任何 chat message 锚定
- **THEN** sidebar 滚动区 MUST 显示空状态文案（例如"这一步还没问过问题"）
- **AND** 输入框 MUST 仍可用，用户可以补问
