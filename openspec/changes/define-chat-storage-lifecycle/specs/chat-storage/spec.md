## ADDED Requirements

### Requirement: Conversation Storage Schema
系统 SHALL 以结构化格式持久化会话与消息，并支持检索与历史回放。

#### Scenario: Schema Fields
- **WHEN** 会话被保存
- **THEN** 它 MUST 包含 `id`, `userId`, `title`, `createdAt`, `updatedAt`, `model` 字段。
- **AND** 消息 MUST 包含 `id`, `conversationId`, `role`（user/assistant）, `content`, `createdAt` 字段。

### Requirement: Conversation Lifecycle - Lazy Creation
系统 SHALL 仅在用户首条消息成功发送时创建持久化的会话记录。

#### Scenario: New Chat State
- **WHEN** 用户进入 “New Chat” 视图
- **THEN** 数据库中 MUST NOT 创建任何会话记录。
- **AND** UI 允许用户输入消息。

#### Scenario: First Message Persistence
- **WHEN** 用户在 “New Chat” 中发送第一条消息
- **THEN** 系统 MUST 创建新的 `Conversation` 记录。
- **AND** 系统 MUST 创建一条代表用户输入的 `Message` 记录。
- **AND** 系统 MUST 创建一条代表 assistant 响应的 `Message` 记录。
- **AND** 响应 MUST 返回新的 `conversationId`。

### Requirement: Message Append
系统 SHALL 支持向已存在的会话追加新消息。

#### Scenario: Appending Message
- **WHEN** 用户在请求中携带已存在的 `conversationId` 发送消息
- **THEN** 新消息 MUST 关联到该会话。
- **AND** 会话的 `updatedAt` MUST 更新。

### Requirement: Chat History Retrieval
系统 SHALL 提供接口用于获取指定会话的消息历史。

#### Scenario: Fetch History
- **WHEN** 客户端请求有效 `conversationId` 的历史
- **THEN** 系统 MUST 返回按时间顺序排列的消息列表。
