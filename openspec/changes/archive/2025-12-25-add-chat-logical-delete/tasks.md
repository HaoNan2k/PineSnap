## Tasks

1. [x] 更新 Prisma schema：为 `Conversation`/`Message` 增加 `deletedAt`，并将 `Message.conversation` 的 `onDelete` 从 `Cascade` 改为 `Restrict`。
2. [x] 创建 DB migration：新增列、更新外键约束（去掉 `ON DELETE CASCADE`），必要时补充索引。
3. [x] 在 `lib/prisma.ts` 增加运行时拦截：禁止对 `Conversation`/`Message` 执行 `delete/deleteMany`。
4. [x] 更新会话 DB 访问层：
   - [x] `deleteConversation(id, userId)` 改为软删除（同时软删该会话下所有消息）。
   - [x] `getConversation` / `getUserConversations` 默认过滤 `deletedAt IS NULL`（会话与消息）。
   - [x] 对“向已删除会话写入”的路径定义处理策略（默认：在写入前校验并返回 404）。
5. [x] 更新 API：
   - [x] `DELETE /api/conversations/[id]` 改为软删语义，保持返回 `{ success: true }`。
   - [x] `GET /api/conversations/[id]` 对已删除会话返回 404。
   - [x] 会话列表接口默认不返回已删除会话。
6. [ ] 回归验证（手动）：
   - [ ] 删除会话后刷新列表不再出现该会话。
   - [ ] 删除后访问 `/api/conversations/[id]` 返回 404。
   - [ ] 应用内任何对 `Conversation/Message` 的物理 delete 调用会直接报错。

