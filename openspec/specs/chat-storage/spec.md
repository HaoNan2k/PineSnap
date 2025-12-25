# chat-storage Specification

## Purpose
本规范定义聊天系统的持久化模型与落库行为，包括 `Conversation`/`Message` 的存储字段语义，以及结构化 `parts`（`ChatPart[]`）在 PostgreSQL `jsonb` 中的持久化约束。

> 说明：本仓库早期曾通过 changes 引入/调整存储规范；主 spec 仅保留**当前实现应遵循的真相约束**。历史对照请查看 `openspec/changes/archive/**`。
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
