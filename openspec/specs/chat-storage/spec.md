# chat-storage Specification

## Purpose
TBD - created by archiving change refactor-chat-conversation-foundation. Update Purpose after archive.
## Requirements
### Requirement: Persist structured message parts in PostgreSQL
系统 SHALL 将消息内容以结构化 `parts` 形式持久化到 PostgreSQL，并使用 `jsonb` 以支持 schema 演进。

#### Scenario: Message parts are stored as jsonb
- **WHEN** 系统保存一条消息
- **THEN** 消息 MUST 存储 `parts` 字段
- **AND** `parts` MUST 为 `ChatPart[]` 的 JSON 表示（存储类型为 `jsonb`）

### Requirement: ChatPart supports full semantic union
系统 SHALL 支持完整的对话语义存储，包括文本、文件引用、工具调用与结果。

#### Scenario: 存储 Tool Call 和 Result
- **WHEN** 模型发起工具调用或产生工具结果
- **THEN** 系统 MUST 全量存储 `toolCallId`, `toolName`, `input`/`output`
- **AND** 存储格式 MUST 符合 `ChatPart` schema

#### Scenario: 存储 File Ref
- **WHEN** 用户发送文件
- **THEN** 系统 MUST 存储文件的 `ref` (内部引用)
- **AND** 系统 MUST NOT 在 DB 中存储文件二进制内容

### Requirement: Store final assistant output first
系统 SHALL 初期仅落库 assistant 的最终结果，不要求边流边存。

#### Scenario: Save final assistant message on completion
- **WHEN** assistant 结束生成
- **THEN** 系统 MUST 创建一条 role 为 `ASSISTANT` 的 `Message`
- **AND** 该消息的 `parts` MUST 反映最终输出内容

### Requirement: Conversation updatedAt must reflect activity
系统 SHALL 在会话追加消息后更新会话的 `updatedAt`，以支持列表按最近活动排序。

#### Scenario: Touch conversation on message append
- **WHEN** 在已存在会话中追加用户消息或 assistant 消息
- **THEN** 系统 MUST 更新对应 `Conversation.updatedAt`

### Requirement: Temporary userId placeholder is server-controlled
在接入真实鉴权前，系统 MAY 使用临时 `userId`（例如 `default-user`），但其来源 MUST 由服务端控制。

#### Scenario: Client cannot set userId
- **WHEN** 客户端发起会话/消息相关请求
- **THEN** 服务端 MUST NOT 信任客户端提供的 `userId`
- **AND** 所有读写 MUST 基于服务端确定的 `userId` 执行隔离过滤

### Requirement: Superseded specification notice
本 delta 规范已被 **`refactor-chat-conversation-foundation`** 中的 `chat-storage` / `chat-conversation` deltas 取代；实现阶段 MUST 以新变更为准。

#### Scenario: Do not implement from superseded delta
- **WHEN** 开发者准备实现聊天存储与生命周期
- **THEN** 实现 MUST 以 `refactor-chat-conversation-foundation` 的 requirements 为准
- **AND** 本 delta SHOULD 仅用于历史对照

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
