# Delta Spec: chat-storage (update-conversation-id-default-to-uuid)

## MODIFIED Requirements

### Requirement: Conversation/Message id MUST be UUID by default
系统 SHALL 默认使用 UUID 作为 `Conversation.id` 与 `Message.id` 的标识符格式，以确保跨端一致性与可预测的 URL 形态。

#### Scenario: 新建会话默认 UUID
- **WHEN** 服务端创建新的 `Conversation`
- **THEN** `Conversation.id` MUST 为 UUID
- **AND** 当客户端提供 `conversationId` 且其为 UUID 时，服务端 SHOULD 复用该 UUID 作为 `Conversation.id`

#### Scenario: 新建消息默认 UUID
- **WHEN** 服务端创建新的 `Message`
- **THEN** `Message.id` MUST 为 UUID

