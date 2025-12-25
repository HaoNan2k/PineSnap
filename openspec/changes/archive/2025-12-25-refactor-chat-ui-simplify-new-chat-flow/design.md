# Design: refactor-chat-ui-simplify-new-chat-flow

## 决策清单

### 本次沿用的既有决策

- **会话 URL**：新对话入口为 `/chat`；历史会话为 `/chat/c/[id]`。
- **会话创建**：懒创建；仅在首条消息发送后创建 DB 会话记录。
- **上下文拼接**：服务端从 DB 拉历史并裁剪，客户端不回传全量历史。
- **Sidebar 刷新**：SWR 获取 `/api/conversations`，由 DataStream 事件触发 `mutate('/api/conversations')`。

### 本次新增/变更的决策

- **D1（稳定 conversationId）**：客户端在进入 `/chat` 页面时生成 UUID，并在任何一次 `/api/chat` 请求中 MUST 携带该 `conversationId`。
- **D2（首条仅改 URL）**：首条消息后 URL 更新 MUST 使用 `window.history.replaceState` 或 `pushState`，不得使用 Next Router 导航，以避免组件卸载导致流式中断。
- **D3（页面级 ChatArea）**：`ChatArea` 从 layout 下沉到 page，`ConversationRuntimeProvider` / `ConversationInitializer` 被删除或退场。

## 组件/路由形态

### `/chat`（新对话）

- 服务器生成 `conversationId = UUID` 并渲染 ChatArea。
- 初始消息为空；不落库。

### `/chat/c/[id]`（历史会话）

- RSC 读取会话与消息历史（若不存在则 404）。
- 将 `initialMessages` 注入 ChatArea。

## 数据流（用户视角时间线）

1. 用户进入 `/chat`
   - 服务端生成 UUID 并渲染 ChatArea（只生成草稿会话键，不落库）。
2. 用户发送首条消息
   - 客户端 `POST /api/chat` 请求体携带 `conversationId`、`clientMessageId`、`input`。
   - 服务端创建 `Conversation`（id=conversationId）与首条用户消息并开始流式。
   - 客户端用 History API 将 URL 更新为 `/chat/c/[conversationId]`（不触发导航）。
3. 生成结束/标题更新
   - 服务端通过 data parts 推送 `data-titleUpdated` / `data-conversationId`（兼容）。
   - `DataStreamHandler` 触发 `mutate('/api/conversations')`，sidebar 刷新。

## 兼容性与容错

- 服务端仍 MAY 接受缺失 `conversationId` 的请求（用于兼容/容错），但 UI 主路径 SHALL 始终带 `conversationId`。


