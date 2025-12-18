# Design: 修复 useChat/路由/懒创建冲突导致的消息不渲染

## 现状盘点（事实）

### UI 侧关键链路（当前 CSR 模式）

- 页面路由：`/chat`（新对话）与 `/chat/c/[id]`（历史会话）。
- UI 使用 `@ai-sdk/react` 的 `useChat`。
- UI 还在客户端 `useEffect` 中 fetch 历史消息，导致时序冲突。

### 服务端关键链路

- `POST /api/chat`：
  - 接收 `conversationId`。
  - 若 ID 对应会话不存在，则创建新会话（Upsert）。
  - 服务端持久化用户消息与 assistant 最终消息。

## 观察到的矛盾/冲突

- **冲突 1：异步数据加载导致的状态不一致**
  - 在 `/chat/c/[id]`，`useChat` 可能先以空数组初始化，随后历史消息 fetch 回来后再 setMessages，容易引发闪烁或覆盖流式中的消息。
  
- **冲突 2：CSR 模式下的 ID 稳定性问题**
  - 客户端组件重新渲染可能导致 ID 重新生成（如果没缓存好），或者在导航过程中状态丢失。

## 设计决策清单（Decision checklist）

- **架构模式**：**从 CSR (Client-Side Rendering) 迁移到 RSC (React Server Components)**。
  - 理由：RSC 能在服务器端直接获取数据，保证 `useChat` 初始化的 `initialMessages` 是完整且正确的，消除异步加载带来的状态管理复杂度。

- **入口与深链**：沿用 `/chat` 与 `/chat/c/[id]`。
- **创建时机**：服务端懒创建（DB 层面），但 ID 由 RSC 层提前生成。
- **状态真相源**：UI 层“渲染”以 `useChat().messages` 为真相源；RSC Page 负责提供初始 messages。

## 推荐方案（RSC + Optimistic ID）

### 1) 架构重构：引入 Server Pages

#### Page `/chat` (Server Component)
- **职责**：
  - 生成一个随机 UUID (`id`).
  - 渲染 `<ChatArea id={id} initialMessages={[]} />`.

#### Page `/chat/c/[id]` (Server Component)
- **职责**：
  - 读取路由参数 `id`.
  - 调用 DB (Prisma) 获取会话历史消息.
  - 转换消息格式为 UI Message.
  - 渲染 `<ChatArea id={id} initialMessages={dbMessages} />`.
  - 处理 404/403 (若会话不存在或无权访问).

### 2) 组件层：ChatArea (Client Component)

- **Props**: 接收 `id` (string) 和 `initialMessages` (Message[]).
- **Initialization**: `useChat({ id, initialMessages })`.
- **Action**: 
  - 发送消息时，调用 `useChat.append` 或 `handleSubmit`.
  - `onFinish` 回调中执行 `window.history.replaceState` 更新 URL.
- **Cleanup**: 移除所有用于 fetch 历史消息的 `useEffect` 和 `pendingMessage` 逻辑.

### 3) 服务端 API 适配

- 确保 `POST /api/chat` 能处理“传入了 ID 但 DB 中不存在”的情况（执行 Upsert/Create）.

## 可验证路径（Acceptance）

- **A1**：访问 `/chat` → RSC 生成 ID → 页面渲染空对话 → 发送消息 → 立即上屏 → URL 变更为 `/chat/c/[id]`。
- **A2**：访问 `/chat/c/[id]` → RSC 读库 → 页面渲染完整历史 → 发送追加消息 → 正常流式输出。
- **A3**：浏览器刷新 → 页面内容不闪烁，保留完整历史。
