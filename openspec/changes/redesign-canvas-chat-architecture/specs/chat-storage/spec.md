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

### Requirement: Query full discussion conversation
系统 SHALL 提供按 `chatConversationId` 拉取整段 chat 消息的 DB 方法（位于 `lib/db/discussion.ts`），返回按 `createdAt` 升序的消息列表（不按 anchor 过滤）。

#### Scenario: 拉取整段讨论
- **WHEN** 调用 `getDiscussionMessages(chatConversationId)`
- **THEN** MUST 返回该 conversation 所有 `deletedAt IS NULL` 的 messages
- **AND** 按 `createdAt` ASC 排序
- **AND** anchor 字段作为元数据返回，但不作为查询条件

### Requirement: Existing orphan canvas messages are cleaned via manual SQL
对于本 change 上线时已存在的"末尾是孤立 user/tool message"的脏 canvas conversation（已知一条：`019bdc0c-8207-77ba-9914-44409c64c36f`），系统 SHALL 通过一次性手写 SQL 软删除（`UPDATE Message SET deletedAt = now() WHERE ...`），并将操作记录在 `docs/incidents/019bdc0c-cleanup.md`。

**说明**：outside voice review 后从工具化降级为手写 SQL。理由：当前已知脏数据仅 1 条；写整套脚本是 over-engineering。如未来发现 2+ 条同类脏数据，再讨论工具化。

#### Scenario: 手写 SQL 软删除
- **WHEN** 部署本 change 至生产前
- **THEN** 操作员 MUST 执行手写 SQL（详见 tasks.md task 8.1）软删除已知脏 message
- **AND** MUST 在 `docs/incidents/019bdc0c-cleanup.md` 记录精确 SQL + 执行时间 + 验证结果

#### Scenario: 验证清理生效
- **WHEN** 手写 SQL 执行完毕
- **THEN** 刷新 019bdc0c learning URL
- **AND** canvas MUST 正常显示（不再卡在骨架屏）
