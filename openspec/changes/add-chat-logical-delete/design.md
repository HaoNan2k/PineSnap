## 决策清单

- **沿用既有决策**
  - 会话与消息的读写隔离以服务端控制的 `userId` 为准（当前为 `default-user`）。
  - 会话列表按 `Conversation.updatedAt` 排序。
  - 会话与消息持久化使用 PostgreSQL + Prisma。
- **本次新增/变更决策**
  - 删除会话/消息的语义改为**逻辑删除**（软删除），通过 `deletedAt` 表达删除状态。
  - 所有默认读取 MUST 过滤 `deletedAt IS NULL`。
  - 应用代码 MUST 禁止对 `Conversation`/`Message` 做物理删除（`delete/deleteMany` 直接抛错）。
  - DB 外键删除行为从 `ON DELETE CASCADE` 改为 `RESTRICT/NO ACTION`（移除级联物理删除）。

## 数据模型

### Prisma schema 变更

- `Conversation`
  - 新增：`deletedAt DateTime?`
- `Message`
  - 新增：`deletedAt DateTime?`
  - 外键：`conversation` relation 的 `onDelete` 从 `Cascade` 改为 `Restrict`（或数据库层 `NO ACTION`）

### 删除语义

- `deleteConversation(id, userId)`：
  - 将 `Conversation.deletedAt` 置为当前时间；
  - 同时将该会话下所有 `Message.deletedAt` 置为当前时间（避免“会话已删但消息仍可被检索”的泄露风险）。
- 读取（会话详情/列表/消息列表）：
  - 默认只返回 `deletedAt = null` 的记录；
  - 对已删除会话的详情读取 MUST 表现为 404（与“不存在”一致）。

## 运行时防呆：禁止物理删除

在 `lib/prisma.ts` 的 PrismaClient 初始化处增加拦截：

- 若 `params.model` 属于 `Conversation` 或 `Message`
- 且 `params.action` 为 `delete` 或 `deleteMany`
- 则直接抛出错误（例如 `Physical delete is forbidden for chat data; use soft delete.`）

目标：保证“应用代码不允许物理删除”，并在开发/测试阶段尽早暴露违规调用。

## 数据库迁移策略

### 迁移内容

- 为 `Conversation` 与 `Message` 新增 `deletedAt` 列（nullable）。
- 修改外键约束：删除现有 `ON DELETE CASCADE` 外键并重建为 `ON DELETE RESTRICT/NO ACTION`。
- 可选索引（按实际查询需求补充）：`(userId, deletedAt)`、`(conversationId, deletedAt)`。

### 回滚策略（最低保障）

若必须回滚：
- 保留新增列不影响旧逻辑；
- 仅回滚应用层过滤与拦截（不建议恢复物理删除能力）。

