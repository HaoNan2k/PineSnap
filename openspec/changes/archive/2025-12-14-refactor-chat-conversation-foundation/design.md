# Design: 聊天会话基础（路由/生命周期/存储/代码结构）

## 背景与原则
- **服务端为真相源**：会话生命周期、历史拼接、落库与权限边界必须在服务端。
- **Vercel AI SDK（beta）适配**：UI 层可使用 `useChat` 进行流式展示，但持久化 schema 不直接绑定 SDK 内部类型；内部定义稳定的 `ChatPart`。
- **懒创建**：避免进入页面即产生空会话记录；但必须保证首条消息开始流式前得到稳定的 `conversationId`。

## 路由设计
- `/chat`：新对话入口（无会话 ID）
- `/chat/c/[id]`：历史会话入口（可深链/可刷新还原/便于权限）

说明：选择 `/chat` 前缀以避免未来其他模块（例如知识管理）与根路径冲突。

## 会话生命周期（状态机）
### S0: 新对话
- URL：`/chat`
- DB：无会话记录
- UI：允许输入

### S1: 发送首条消息
- 客户端 `POST /api/chat`，不带 `conversationId`，仅带本次 `input: ChatPart[]` 与幂等键 `clientMessageId`

### S2: 服务端创建并确认会话身份（关键）
- 服务端在开始模型流式输出前：
  - 创建 `Conversation`（绑定 `userId`）
  - 创建用户 `Message`（落库 `parts`）
  - 将 `conversationId` 尽早回传给客户端（A1：UIMessageStream 的 data part，必须早于任何 assistant token）
- 客户端收到后立即 `router.replace('/chat/c/<id>')` 并将 UI 状态绑定到真实 `conversationId`

### S3: 流式生成与落库
- 服务端流式输出 assistant 内容给客户端
- 初期策略：仅在结束时落库一条 assistant `Message`（最终 `parts`/最终文本）

### S4: 追加消息
- URL 已为 `/chat/c/[id]`
- 客户端后续 `POST /api/chat` 携带真实 `conversationId` 与本次 `input`
- 服务端从 DB 拉历史并按策略裁剪后调用模型

## API 契约（概念）
### `POST /api/chat`
#### Request
- `conversationId?: string`
- `clientMessageId: string`（幂等键，客户端生成，重试同一条消息必须保持不变）
- `input: ChatPart[]`（本次用户输入）

#### Response（流式）
- 早期元信息包含 `conversationId`（用于客户端 URL 切换；采用 A1 data part）
- 随后为 assistant 流式输出
- 结束后触发落库 assistant `Message`（最终）

> 具体采用 header / data stream / 首帧 JSON 的方式，在实现阶段以本仓库安装的 Vercel AI SDK beta 类型与能力为准（优先读 `node_modules/ai` 与 `node_modules/@ai-sdk/react`）。

### `GET /api/conversations`
- 返回轻量列表：`id/title/createdAt/updatedAt`（可选 lastMessagePreview，后续再定）

### `GET /api/conversations/[id]`
- 返回会话详情与消息列表（初期可一次性返回；分页策略后续定义）

### `PATCH /api/conversations/[id]`
- 修改标题

### `DELETE /api/conversations/[id]`
- 删除会话（级联删除消息）

## 存储设计
### ChatPart（内部稳定 schema）
ChatPart 采用可演进的判别联合（discriminated union），最小先支持：
- `text`

后续扩展方向（不在本变更实现范围内，但 schema 需可承载）：
- `tool_call` / `tool_result`
- `image`（url/file）
- `error`
- `metadata`

### 数据表（概念）
#### Conversation
- `id`（服务端生成，用于 URL）
- `userId`（当前可为 `default-user`；未来接入 Auth 替换）
- `title`
- `createdAt`、`updatedAt`

#### Message
- `id`
- `conversationId`
- `role`（USER/ASSISTANT/SYSTEM）
- `parts`（PostgreSQL `jsonb`，存 `ChatPart[]`）
- `createdAt`
- 预留：`parentMessageId`（暂不实现 regenerate，但为未来保留）

### updatedAt 更新
会话 `updatedAt` 必须在追加消息后更新；仅插入 Message 并不会自动更新 Conversation 的 `@updatedAt`，实现阶段应显式 touch Conversation。

## 幂等与去重（为什么是 clientMessageId 而不是 requestId）
- `requestId` 更适合做链路追踪/观测（每次请求尝试通常不同），不适合作为幂等键。
- `clientMessageId` 语义上对应“一条用户消息”，可在网络重试/重复提交时保持不变，从而实现：
  - 首条消息重试不重复创建会话（通过 `Conversation.firstClientMessageId` + 唯一约束）
  - 同一会话内不重复写入同一条用户消息（通过 `Message.clientMessageId` + 唯一约束）

### 建议的唯一约束（PostgreSQL）
- `Conversation`: `@@unique([userId, firstClientMessageId])`（`firstClientMessageId` 允许为空；仅对首条消息生效）
- `Message`: `@@unique([conversationId, clientMessageId])`（`clientMessageId` 允许为空；仅对带幂等键的消息生效）

## 代码结构（建议约定）
- `components/chat/**`：UI feature（不依赖 Prisma，不负责落库/鉴权）
- `app/api/**/route.ts`：Route Handlers（校验/鉴权/编排，不沉淀复杂业务）
- `lib/chat/**`：聊天领域服务（生命周期、历史拼接、ChatPart 映射）
- `lib/db/**`：数据访问（Prisma 查询/事务）

## 标题策略（先易后难）
第一版：
- 规则生成标题（例如取首条 user 文本的前 N 字）

第二版：
- assistant 完成后异步调用模型生成更准确标题（不阻塞主对话）


