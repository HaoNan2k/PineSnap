# Proposal: 修复聊天 UI 消息不渲染（useChat 流式链路）

## 背景 / 现象（Facts）

在当前实现中，聊天页面存在严重的用户可见问题：

- 在 `/chat` 发送消息后，UI 仍停留在“空态/欢迎态”，**看不到用户消息气泡**。
- 切换到 `/chat/c/[id]` 历史会话后，主区域也可能**看不到历史消息**。
- 网络层面可观察到：`POST /api/chat` 可能返回 `200`，会话列表也会更新，但消息列表区域仍为空。

该行为违反现有规范中“历史会话入口必须展示历史消息”以及“空态仅在消息数量为 0 时显示”等要求。

## 目标（Goals）

- **G1**：用户发送消息后，UI MUST 立即渲染该条用户消息（不依赖服务端回传完成）。
- **G2**：服务端返回流式输出后，UI MUST 持续渲染 assistant 的增量输出，并在完成后展示最终内容。
- **G3**：在懒创建场景下（首条消息无 `conversationId`），客户端在 URL 更新为 `/chat/c/[id]` 的过程中，**UI MUST NOT 丢失当前对话的消息列表**。
- **G4**：访问 `/chat/c/[id]` 时，UI MUST 渲染该会话历史消息（按时间顺序）。

## 非目标（Non-goals）

- 不在本变更中引入真实鉴权（仍使用服务端控制的临时 `userId`）。
- 不在本变更中引入“边流边存”或改变 DB schema。
- 不将 `vercel-labs/gemini-chatbot` 模板代码直接照搬到项目中（其 AI SDK 版本不同，仅作结构与交互参考）。

## 方案概览（Proposed approach）

本问题的根因倾向于**客户端 chat 状态与路由/会话加载的生命周期冲突**。我们决定采用 **Server Component + Client-Side Optimistic ID** 混合模式来彻底解决此问题（参考 `vercel-labs/gemini-chatbot` 架构）。

### 核心变更

**1. 架构重构：RSC (Server Component) 负责数据预取**：
- **Page `/chat` (Server Component)**：负责生成随机的 `draftId` (UUID)，并渲染 `<ChatArea id={draftId} initialMessages={[]} />`。
- **Page `/chat/c/[id]` (Server Component)**：负责直接从 DB 读取历史消息，并渲染 `<ChatArea id={id} initialMessages={messages} />`。
- **Benefit**：消除了客户端异步 fetch 导致的状态闪烁和不一致，`useChat` 初始化时即拥有正确的数据。

**2. 采用 Client-Side Optimistic ID (Draft ID) 模式**：
- **统一 Truth**：`useChat({ id })` 使用传入的 `id` 初始化，且在整个会话生命周期内不再改变。
- **URL 同步**：用户发送消息后，直接使用该 `id` 更新 URL 为 `/chat/c/[id]`（`replaceState`）。
- **服务端信任**：客户端发送消息时携带该 `conversationId`，服务端若发现 ID 不存在则直接以该 ID 创建会话（Upsert 逻辑），若已存在则追加消息。

**3. 彻底移除 PendingMessage**：
- 不需要“先创建后发送”的两步走逻辑，点击发送即刻触发流式请求，0 延迟。

提议采取“最小可验证闭环”的改造：

- **A. 新对话（/chat）**：
  - Server Page 生成 `draftId`。
  - `ChatArea` 挂载，`useChat` 初始化。
  - 用户点击发送 -> `useChat` 立即渲染用户消息 -> 请求 `/api/chat` (带 ID) -> URL 变为 `/chat/c/[draftId]`。

- **B. `/chat/c/[id]` 场景**：
  - Server Page 读库拿到 `messages`。
  - `ChatArea` 挂载，`useChat` 使用这些 `messages` 初始化。
  - 用户看到完整历史。

## 参考（Reference, not to be copied verbatim）

- `vercel-labs/gemini-chatbot`：使用了 RSC 生成 ID 和获取 initialMessages 的模式。
- ChatGPT：使用了类似的服务端预创建/ID下发逻辑（虽然我们简化为客户端/RSC 生成 ID）。

## 风险与回滚（Risks & rollback）

- **风险**：将 Page 重构为 Server Component 可能需要调整部分 Context 使用方式。
- **回滚**：所有变更限定在 Page/UI 层；如出现问题可回滚到当前 CSR 实现。
