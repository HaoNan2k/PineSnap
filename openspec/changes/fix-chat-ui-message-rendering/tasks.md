# Tasks: fix-chat-ui-message-rendering

> 目标：通过 RSC (Server Components) + Optimistic ID 重构，彻底修复消息不渲染问题。

- [ ] 1. 准备工作：
  - [ ] 1.1 确认 `uuid` 库或其他 ID 生成库已就位（如无则添加 `nanoid` 或使用 `crypto.randomUUID`）。
  - [ ] 1.2 确认 `lib/db/conversation` 中有 `getConversationById` 等辅助函数可供 RSC 调用。

- [ ] 2. 重构页面架构 (RSC)：
  - [ ] 2.1 重构 `app/chat/page.tsx`：转为 Server Component，生成 ID，渲染 `ChatArea`。
  - [ ] 2.2 重构 `app/chat/c/[id]/page.tsx`：转为 Server Component，读取 DB 历史消息，渲染 `ChatArea`。

- [ ] 3. 重构组件层 (Client Component)：
  - [ ] 3.1 修改 `components/chat/components/ChatArea.tsx`：
    - [ ] 接受 `id` 和 `initialMessages` props。
    - [ ] 移除 `pendingMessage` 状态。
    - [ ] 移除内部 fetch 历史消息的 `useEffect`。
    - [ ] 移除 `onConversationCreated` 等回调，改为内部 `window.history.replaceState`。
  - [ ] 3.2 适配 `useChat`：使用 props 中的 `id` 和 `initialMessages` 初始化。
  - [ ] 3.3 适配发送逻辑：直接调用 `append` / `reload`，确保请求体带上 `conversationId`。

- [ ] 4. 清理旧代码：
  - [ ] 4.1 检查 `useConversations` hook 是否还需要（可能仅用于侧边栏列表，需保留但与主区域解耦）。
  - [ ] 4.2 移除不再使用的 `onConversationActivity` 冒泡（如果架构改变后不再需要）。

- [ ] 5. 服务端适配：
  - [ ] 5.1 检查 `app/api/chat/route.ts`，确保支持 Upsert 逻辑（即 ID 不存在时自动创建）。

- [ ] 6. 验证：
  - [ ] 6.1 新对话：打开 -> 空白 -> 发送 -> 立即上屏 -> URL 变 -> 回复正常。
  - [ ] 6.2 历史对话：打开 -> 立即显示历史 -> 追加发送 -> 正常。
  - [ ] 6.3 刷新页面：历史不丢。
