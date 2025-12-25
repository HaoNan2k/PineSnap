# Delta Spec: chat-ui (refactor-chat-ui-simplify-new-chat-flow)

## MODIFIED Requirements

### Requirement: First-send URL update MUST NOT interrupt streaming
UI SHALL 在首条发送后更新 URL，但 MUST NOT 触发真实导航（避免卸载导致的流式中断与消息重置）。

#### Scenario: 新对话首条发送后仅更新地址栏
- **WHEN** 用户在 `/chat` 发送首条消息
- **THEN** UI MUST 保持当前 React 树与流式响应不中断
- **AND** UI MUST 使用 `window.history.replaceState` 或 `pushState` 更新 URL 为 `/chat/c/[id]`
- **AND** UI MUST NOT 使用 Next Router 导航（例如 `router.push/replace`）来完成该 URL 更新

### Requirement: ChatArea lifecycle is page-owned
UI SHALL 将聊天实例生命周期收敛到 page 层，避免通过 layout 常驻 + 额外同步组件引入状态分裂。

#### Scenario: `/chat` 与 `/chat/c/[id]` 各自拥有 ChatArea
- **WHEN** 用户访问 `/chat`
- **THEN** 页面 MUST 渲染 ChatArea 并注入草稿 `conversationId` 与空的 `initialMessages`
- **WHEN** 用户访问 `/chat/c/[id]`
- **THEN** 页面 MUST 渲染 ChatArea 并注入该 `id` 与历史 `initialMessages`


