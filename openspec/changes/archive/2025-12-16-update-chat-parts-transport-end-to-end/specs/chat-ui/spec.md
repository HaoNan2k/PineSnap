# Delta Spec: update-chat-parts-transport-end-to-end（chat-ui）

## MODIFIED Requirements

### Requirement: UI sends messages using parts as the source of truth
UI SHALL 以 `parts` 作为发送与渲染的一致真相源，避免“渲染用 parts、发送用 text”的双轨状态。

#### Scenario: 发送 text parts 的用户消息
- **WHEN** 用户在输入框提交文本
- **THEN** UI MUST 构造包含 `parts: [{ type: "text", text: ... }]` 的用户消息
- **AND** UI MUST 通过 `useChat().sendMessage` 发送该消息（而非仅发送 `{ text: string }` 造成可扩展字段丢失）

#### Scenario: 发送包含 file part 的用户消息
- **WHEN** 用户发送包含文件的消息（file part）
- **THEN** UI MUST 构造包含 file part 的用户消息并发送
- **AND** UI MUST 在消息列表中展示该 file part 的最小可见性（例如文件名标签/卡片）

### Requirement: URL updates after server confirms conversationId
UI SHALL 在新对话首条消息场景中，以服务端在流内返回的真实 `conversationId` 为准更新 URL。

#### Scenario: 新对话首条消息后 URL 更新
- **WHEN** 用户在 `/chat` 发送首条消息
- **AND** UI 从流内 data part 收到 `conversation_id`
- **THEN** UI MUST 将 URL 更新为 `/chat/c/[id]`
- **AND** MUST 使用服务端返回的 `id`（而非客户端本地草稿 id）

## References

- Vercel AI SDK 6 Beta：`https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta`


