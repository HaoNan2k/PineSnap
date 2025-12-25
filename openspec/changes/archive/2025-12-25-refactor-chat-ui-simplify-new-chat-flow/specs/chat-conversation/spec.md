# Delta Spec: chat-conversation (refactor-chat-ui-simplify-new-chat-flow)

## MODIFIED Requirements

### Requirement: Lazy conversation creation with stable client conversationId
系统 SHALL 采用懒创建，并在新对话状态下使用稳定的 `conversationId` 作为会话键，以避免首条发送后更换 ID 导致的 UI/URL 不一致与流式中断。

#### Scenario: `/chat` 生成草稿会话键但不落库
- **WHEN** 用户访问 `/chat`
- **THEN** 系统 MUST 进入“新对话”状态
- **AND** 系统 MUST 生成一个 UUID 作为草稿 `conversationId`
- **AND** 数据库 MUST NOT 仅因访问页面而创建会话记录

#### Scenario: 首条消息携带 conversationId 并懒创建
- **WHEN** 客户端在“新对话”状态发送首条消息
- **THEN** 请求体 MUST 包含 `conversationId`（UUID）、`clientMessageId` 与 `input`
- **AND** 服务端 MUST 创建新的 `Conversation`（id = `conversationId`）
- **AND** 服务端 MUST 创建一条用户 `Message`
- **AND** 客户端 MUST 使用 History API 将 URL 更新为 `/chat/c/[conversationId]`（不得触发真实导航）

#### Scenario: 服务端回传 conversationId 作为确认（兼容）
- **WHEN** 服务端接收到消息请求
- **THEN** 服务端 MAY 通过 UIMessageStream data part 回传 `conversationId` 作为确认信息
- **AND** 客户端 SHOULD 以该确认值刷新 sidebar 数据（例如触发 `mutate('/api/conversations')`）


