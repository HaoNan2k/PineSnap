# Design: 聊天存储与生命周期

## 状态（已被取代）
本设计已被 **`refactor-chat-conversation-foundation`** 取代，原因包括但不限于：
- 路由与入口从讨论中的 `/chat` 体系收敛为 `/chat` + `/chat/c/[id]`
- 懒创建的关键点明确为：**开始流式前创建会话并尽早回传 `conversationId`**
- 消息内容持久化收敛为 PostgreSQL `jsonb` 的 `ChatPart[]`（内部稳定 schema）

除非为历史对照，否则不要再以本设计作为实现依据。

## 背景
我们需要持久化聊天历史。LibreChat 使用 MongoDB，并采用“会话 + 消息”两类集合的方式（Conversation 保存消息引用，Message 保存 conversationId 等信息）。本项目将保留核心关系语义，并适配关系型数据库（例如 PostgreSQL）与 Prisma。

## 目标
- 持久化会话与消息。
- 支持未来的“分叉/回溯/重新生成”能力：通过 `parentMessageId`（可选）表达树状历史。
- 高效地读取某个会话的历史消息列表。

## 数据模型（概念性 Prisma）

```prisma
model Conversation {
  id            String    @id @default(cuid())
  title         String    @default("New Chat")
  userId        String    // 外部用户 ID
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 设置
  model         String?   // 会话默认使用的模型标识

  messages      Message[]

  @@index([userId])
}

model Message {
  id             String        @id @default(cuid())
  conversationId String
  conversation   Conversation  @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  // 内容
  content        String        @db.Text // 结构化 JSON 或纯文本（后续根据实现选型）
  role           String        // 'user' | 'assistant' | 'system'

  // 树结构（LibreChat 风格）
  parentMessageId String?
  // 注：如需快速获取 children，可在未来增加反向关系或冗余索引

  createdAt      DateTime      @default(now())

  // 元信息
  model          String?       // 若单条消息使用不同模型，可写在这里

  @@index([conversationId])
}
```

## 生命周期状态机

1. **未初始化**：用户进入聊天页（例如 `/chat`）。UI 显示空态，不存在会话 ID。
2. **编辑中**：用户输入消息，仍无后端会话 ID。
3. **创建（乐观态）**：
   - 用户发送消息
   - 前端生成临时 `temp-id`（仅用于 UI 占位）
   - 调用 `POST /api/chat`，并传入 `conversationId = "new"`（或缺省）
4. **已持久化**：
   - 后端创建 `Conversation`
   - 后端创建用户 `Message`
   - 后端流式生成 assistant 响应
   - 后端创建 assistant `Message`（可以是最终合并后的完整消息，或按块策略落库——由实现阶段决定）
   - 响应返回真实 `conversationId`
5. **活跃会话**：后续消息携带真实 `conversationId`，持续追加。

## 关键决策
- **懒创建（Lazy Creation）**：仅在首条消息成功发送时创建会话，避免产生大量空的 “New Chat” 记录。
- **关系一致性**：Message 通过 `conversationId` 归属会话；Conversation 通过关系查询获得 messages。
- **为分支预留结构**：引入 `parentMessageId` 以支持未来的 regeneration/branching（参考 LibreChat 的 `parentMessageId`）。

## 风险
- **并发/竞态**：在新会话尚未返回真实 ID 前若允许连续发送，可能导致重复创建会话；前端需要在拿到 `conversationId` 前对发送进行排队/锁定。
- **迁移与扩展**：该结构足够简单，未来更换数据库或新增字段成本可控。
