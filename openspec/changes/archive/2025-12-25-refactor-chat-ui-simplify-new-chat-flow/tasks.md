# Tasks: refactor-chat-ui-simplify-new-chat-flow

- [x] 编写 delta specs：`chat-conversation` 与 `chat-ui`（首条带 conversationId、首条仅改 URL、不触发导航、组件职责简化）
- [x] 实现：移除 `ConversationRuntimeProvider`/`ConversationInitializer`，ChatArea 改为 page-level
- [x] 实现：`/chat` 服务端生成 UUID 并注入 ChatArea；`/chat/c/[id]` 加载历史并注入
- [x] 实现：首条发送后用 History API 更新 URL（不使用 `router.replace/push`）
- [x] 回归：首条可见回复、连续发送不新建会话、sidebar 刷新、历史页刷新可回放
- [x] 校验：`openspec validate refactor-chat-ui-simplify-new-chat-flow --strict` 与 `openspec validate --all --strict`


