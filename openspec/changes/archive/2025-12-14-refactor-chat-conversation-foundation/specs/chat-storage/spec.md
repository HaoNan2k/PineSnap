# chat-storage（delta）

## ADDED Requirements

### Requirement: Persist structured message parts in PostgreSQL
系统 SHALL 将消息内容以结构化 `parts` 形式持久化到 PostgreSQL，并使用 `jsonb` 以支持 schema 演进。

#### Scenario: Message parts are stored as jsonb
- **WHEN** 系统保存一条消息
- **THEN** 消息 MUST 存储 `parts` 字段
- **AND** `parts` MUST 为 `ChatPart[]` 的 JSON 表示（存储类型为 `jsonb`）

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


