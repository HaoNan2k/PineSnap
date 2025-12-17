# Delta Spec: update-chat-parts-transport-end-to-end（chat-conversation）

## MODIFIED Requirements

### Requirement: Request body supports structured parts with optional conversationId
系统 SHALL 支持客户端以结构化 `parts` 发送本次输入；首条消息场景中 `conversationId` MUST 为可选。

#### Scenario: 新对话首条消息不携带 conversationId
- **WHEN** 客户端在“新对话”状态发送首条消息
- **AND** 请求体不包含 `conversationId`
- **THEN** 请求体 MUST 包含 `clientMessageId`（UUID）与 `input`（结构化 `ChatPart[]`）
- **AND** 服务端 MUST 在开始流式输出前创建新的 `Conversation`
- **AND** 服务端 MUST 在流内 data part 中尽早回传真实 `conversationId`
- **AND** 客户端 MUST 将 URL 更新为 `/chat/c/[id]`

#### Scenario: 历史会话追加消息携带 conversationId
- **WHEN** 客户端在历史会话页面发送消息
- **THEN** 请求体 MUST 包含 `conversationId`
- **AND** 请求体 MUST 包含 `clientMessageId`（UUID）与 `input`（结构化 `ChatPart[]`）

### Requirement: Transport preserves parts semantics across the boundary
系统 SHALL 确保客户端传输层（Transport）不会将结构化 parts 压扁为纯文本，从而丢失语义信息。

#### Scenario: 发送包含多段 parts 的用户消息
- **WHEN** 客户端发送一条包含多段 `parts` 的用户消息（例如多段 text + file part）
- **THEN** Transport MUST 将其映射为后端请求体的 `input: ChatPart[]`
- **AND** 映射 MUST 保留每个 part 的 `type` 与关键字段（不进行 join/flatten）

## References

- Vercel AI SDK 6 Beta：`https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta`


