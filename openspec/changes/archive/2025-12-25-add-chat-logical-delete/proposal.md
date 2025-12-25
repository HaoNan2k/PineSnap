## 背景 / 问题

当前会话删除通过 `DELETE /api/conversations/[id]` 触发 Prisma `conversation.delete()` 进行**物理删除**，并且数据库外键配置为 `ON DELETE CASCADE`，会导致关联消息被级联物理删除。该行为不符合聊天系统对数据可追溯、可恢复、可审计的要求，并且会带来误删不可逆、线上排障困难等风险。

## 目标

- 删除会话与消息的语义改为**逻辑删除**（软删除）。
- 默认查询与列表**不返回已删除**的会话/消息。
- **应用代码禁止物理删除**：对 `Conversation` / `Message` 的 `delete/deleteMany` 在运行时强制拦截并报错。
- 去掉 DB 级联物理删除：移除 `Message -> Conversation` 的 `ON DELETE CASCADE`，避免绕过应用层导致的级联物理删。

## 非目标

- 本变更不引入“恢复已删除会话”的 UI/交互（仅保证数据层可恢复）。
- 本变更不接入真实鉴权；沿用服务端控制的临时 `userId`（如 `default-user`）。
- 不改路由形态（仍使用 `DELETE /api/conversations/[id]`），仅调整其语义与实现。

## 范围

- Prisma schema：为 `Conversation` / `Message` 增加软删字段（如 `deletedAt`），并调整外键删除策略。
- 数据库 migration：新增列、更新外键约束。
- 服务器端 DB 访问层：`deleteConversation` 默认改为软删除；所有读取默认过滤 `deletedAt IS NULL`。
- Prisma client 初始化：增加运行时拦截，禁止物理删除。
- API：`DELETE /api/conversations/[id]` 改为软删除语义；读取接口对已删除会话返回 404。

