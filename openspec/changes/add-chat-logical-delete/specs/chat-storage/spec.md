## MODIFIED Requirements

### Requirement: Soft delete for chat persistence
系统 MUST 使用逻辑删除（软删除）而非物理删除来“删除”聊天会话与消息，并确保默认读取不会返回已删除数据。

#### Scenario: Deleting a conversation marks rows deleted
- **WHEN** 客户端请求删除一个会话
- **THEN** 系统 MUST 将该 `Conversation` 标记为已删除（例如写入 `deletedAt`）
- **AND** 系统 MUST 将该会话下的 `Message` 同步标记为已删除
- **AND** 系统 MUST NOT 物理删除任何 `Conversation/Message` 行

#### Scenario: Default queries exclude deleted data
- **WHEN** 系统查询会话列表或会话详情
- **THEN** 查询 MUST 默认过滤 `deletedAt IS NULL`
- **AND** 已删除会话的消息历史 MUST 默认不返回

### Requirement: Application must forbid physical deletes
应用代码 MUST 禁止对聊天数据执行物理删除。

#### Scenario: Prisma delete is rejected at runtime
- **WHEN** 应用代码尝试对 `Conversation` 或 `Message` 执行 `delete` 或 `deleteMany`
- **THEN** 系统 MUST 直接拒绝该操作并抛出错误

