# Tasks: refactor-chat-conversation-foundation

## 0. 提案与校验
- [x] 补齐 delta specs（本变更的 requirements）
- [x] `openspec validate refactor-chat-conversation-foundation --strict`

## 1. 路由与页面
- [ ] 删除 `app/socraticu/**`，并将根路径 `/` 默认路由到 `/chat`
- [x] 新增 `app/chat/page.tsx` 作为新对话入口
- [x] 新增 `app/chat/c/[id]/page.tsx` 作为历史会话入口
- [ ] 确保 URL 切换后 UI 状态绑定到真实 `conversationId`（通过 A1 流内元信息）

## 2. 数据模型（Prisma + PostgreSQL）
- [x] 在 `prisma/schema.prisma` 中将消息内容改为 `jsonb parts`（引入 `ChatPart[]` 持久化字段）
- [x] 保留 `parentMessageId` 作为未来 regenerate 预留（本变更不实现）
- [x] 创建 migration 并确保不修改历史 migration
- [ ] 幂等键与唯一约束：
  - [ ] `Conversation.firstClientMessageId`（nullable）+ `@@unique([userId, firstClientMessageId])`
  - [ ] `Message.clientMessageId`（nullable）+ `@@unique([conversationId, clientMessageId])`

## 3. 服务端 API（Route Handlers）
- [x] `POST /api/chat`：
  - [ ] 支持懒创建：缺省 `conversationId` 时，在开始流式前创建会话并通过 A1（UIMessageStream data part）回传真实 id
  - [ ] 仅接收本次 `input: ChatPart[]`、`clientMessageId` 与可选 `conversationId`
  - [x] 初期仅落最终 assistant 消息（不边流边存）
  - [x] 追加消息时显式 touch `Conversation.updatedAt`
- [x] `GET /api/conversations`：返回轻量列表
- [x] `GET /api/conversations/[id]`：返回会话详情与消息列表
- [x] `PATCH /api/conversations/[id]`：支持改标题
- [x] `DELETE /api/conversations/[id]`：删除会话与消息

## 4. 领域层与数据访问层
- [x] `lib/chat/**`：定义 `ChatPart` schema 与映射（与 Vercel AI SDK beta 解耦）
- [x] `lib/db/**`：Conversation/Message 的数据访问函数（函数式、显式依赖注入）

## 5. 标题策略
- [x] 第一版：规则生成标题（不调用模型，不阻塞主对话）
- [ ] 第二版：异步模型生成标题（后续变更）

## 6. 校验与回归
- [ ] 覆盖关键路径：新对话首条消息（幂等重试） -> URL 切换 -> 历史回放 -> 追加消息 -> 列表排序
