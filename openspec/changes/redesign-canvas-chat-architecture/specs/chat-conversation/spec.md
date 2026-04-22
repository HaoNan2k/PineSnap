## ADDED Requirements

### Requirement: Conversation has explicit kind to distinguish canvas and chat threads
系统 SHALL 在 `Conversation` 表新增 `kind` 字段（枚举：`canvas` | `chat`）。每条 conversation 的 kind 在创建时确定，**不可变更**。

#### Scenario: 创建 canvas conversation 时设置 kind
- **WHEN** 系统为新 learning 创建 canvas conversation
- **THEN** `Conversation.kind` MUST 写入 `canvas`

#### Scenario: 创建 chat conversation 时设置 kind
- **WHEN** 系统为新 learning 创建 chat conversation
- **THEN** `Conversation.kind` MUST 写入 `chat`

#### Scenario: 历史 conversation 默认为 canvas
- **WHEN** 数据库迁移执行后
- **THEN** 所有迁移前已存在的 Conversation 的 `kind` MUST 默认为 `canvas`（向后兼容）

### Requirement: Learning has exactly one canvas and at most one chat conversation
系统 SHALL 确保每个 learning 通过 `LearningConversation` 关联到恰好一条 `kind=canvas` 的 Conversation；可以可选关联零条或一条 `kind=chat` 的 Conversation。

#### Scenario: getState 返回两条 conversation 的引用
- **WHEN** tRPC `learning.getState` 被调用
- **THEN** 响应 MUST 包含 `canvasConversationId`（必填）与 `chatConversationId`（可选，首次提问时懒创建）

#### Scenario: chat conversation 懒创建
- **WHEN** 用户首次在 sidebar 输入框发送提问
- **AND** 该 learning 还没有关联的 `kind=chat` Conversation
- **THEN** 服务端 MUST 在写入第一条 chat message 之前，原子创建 chat Conversation 并建立 LearningConversation 关联

## MODIFIED Requirements

### Requirement: Lazy conversation creation before streaming
系统 SHALL 采用懒创建；在首条消息开始流式输出前，服务端 MUST 创建持久化会话并尽早回传真实 `conversationId`。

**修改说明**：原有"懒创建" 行为对 canvas conversation 仍然适用；新增 chat conversation 的懒创建语义（在首次提问时创建）。

#### Scenario: 首条消息触发 canvas conversation 创建
- **WHEN** 客户端在新 learning 首次发起 canvas 请求（如 `/api/learn/chat`）
- **THEN** 服务端 MUST 创建 `kind=canvas` 的 Conversation
- **AND** 服务端 MUST 通过响应回传 `conversationId`

#### Scenario: 首次提问触发 chat conversation 创建
- **WHEN** 客户端在 sidebar 首次发起 discussion 请求（如 `/api/learn/discussion`）
- **AND** 该 learning 没有关联的 chat Conversation
- **THEN** 服务端 MUST 创建 `kind=chat` 的 Conversation
- **AND** 服务端 MUST 在写入 message 前完成 LearningConversation 关联

#### Scenario: 客户端复用已存在的 conversationId
- **WHEN** 客户端后续发起请求
- **THEN** 请求体 MUST 携带对应 kind 的 conversationId
- **AND** 服务端 MUST 复用，不再重复创建
