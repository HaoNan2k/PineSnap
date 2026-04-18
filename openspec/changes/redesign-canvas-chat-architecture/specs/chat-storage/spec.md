## ADDED Requirements

### Requirement: Conversation kind enum
系统 SHALL 在 `Conversation` 表新增非空枚举字段 `kind`，取值范围 `canvas` | `chat`，默认 `canvas`（兼容历史数据）。

#### Scenario: Schema 包含 kind 字段
- **WHEN** Prisma schema 应用迁移后
- **THEN** `Conversation` 表 MUST 包含 `kind` 列
- **AND** 该列 MUST 为非空，类型为 `ConversationKind` 枚举

#### Scenario: 历史数据兼容
- **WHEN** 数据库迁移执行
- **THEN** 所有已存在的 Conversation 行的 `kind` MUST 设为 `canvas`

### Requirement: Message anchoring to canvas step
系统 SHALL 在 `Message` 表新增可空字段 `anchoredCanvasMessageId`（外键引用 `Message.id`，自引用）。仅 `kind=chat` 的 Conversation 中的 message 允许设置该字段，引用必须指向 `kind=canvas` 的 Conversation 中的 assistant message。

#### Scenario: chat message 写入 anchor
- **WHEN** 系统持久化一条来自 discussion endpoint 的 message
- **THEN** `anchoredCanvasMessageId` MUST 设为该次提问发起时所在的 canvas step 的 assistant message id

#### Scenario: canvas message 不写 anchor
- **WHEN** 系统持久化 canvas conversation 的 message
- **THEN** `anchoredCanvasMessageId` MUST 为 NULL

#### Scenario: anchor 有索引
- **WHEN** Prisma schema 应用迁移后
- **THEN** `anchoredCanvasMessageId` 字段 MUST 有索引，以支持按 anchor 高效查询

### Requirement: Query messages anchored to a specific canvas step
系统 SHALL 提供按 `anchoredCanvasMessageId` 过滤 chat messages 的 DB 方法（位于 `lib/db/discussion.ts`），返回按 `createdAt` 升序的消息列表。

#### Scenario: 按 anchor 拉取讨论
- **WHEN** 调用 `getDiscussionByAnchor(canvasMessageId)`
- **THEN** MUST 返回所有 `anchoredCanvasMessageId = canvasMessageId` 且 `deletedAt IS NULL` 的 messages
- **AND** 按 `createdAt` ASC 排序

### Requirement: Cleanup orphan trailing messages from canvas conversations
系统 SHALL 提供一次性数据清理脚本（`scripts/cleanup-orphan-conversations.ts`），扫描所有 `kind=canvas` 的 Conversation，识别末尾是 `role=user` 或 `role=tool` 且无后续 `role=assistant` message 的会话，并将这些孤立尾巴软删除（设置 `deletedAt`）。

#### Scenario: 识别孤立尾巴
- **WHEN** 脚本扫描某个 canvas conversation
- **AND** 该会话最后一条 message 的 role 为 user 或 tool
- **AND** 之后没有任何 deletedAt IS NULL 的 message
- **THEN** 脚本 MUST 将该尾巴 message 标记为待清理

#### Scenario: 软删除而非物理删除
- **WHEN** 脚本执行清理
- **THEN** MUST 通过设置 `deletedAt` 软删除
- **AND** MUST NOT 物理删除（DELETE FROM）

#### Scenario: 输出 report
- **WHEN** 脚本运行
- **THEN** MUST 在 `scripts/cleanup-report-{timestamp}.json` 输出每条清理记录（learningId, conversationId, messageId, role, parts 概要）
- **AND** 报告 MUST 支持人工 review 与回滚
