# chat-conversation (delta)

## MODIFIED Requirements

### Requirement: Chat routes and deep-linking
系统 SHALL 确保路由参数与 chat UI 内部状态标识一致，以支持深链与刷新恢复，同时避免在异步加载过程中误进入空态。

#### Scenario: 历史会话入口
- **WHEN** 用户访问 `/chat/c/[id]`
- **THEN** 客户端 MUST 使用该路由参数 `id` 作为 chat UI 状态的稳定标识（例如 `useChat({ id })` 的 `id`）
- **AND** 客户端 MUST 在会话详情尚未加载完成时避免将消息列表重置为空态（除非该会话确实无消息）

### Requirement: Lazy conversation creation with Optimistic ID
系统 SHALL 采用“客户端生成 ID + 服务端懒创建”的模式，以消除首条消息的网络延迟并简化状态管理。

#### Scenario: 客户端生成 Draft ID（Optimistic ID）
- **WHEN** 客户端进入“新对话”状态（`/chat`）
- **THEN** 客户端 MUST 立即生成一个唯一 ID（UUID/CUID）作为 `draftId`
- **AND** 客户端 MUST 使用该 `draftId` 初始化 chat UI 状态
- **AND** 客户端 MUST 在发送首条消息时携带该 ID
- **AND** 客户端 MUST 在发送时（或之前）将 URL 更新为 `/chat/c/[draftId]`

#### Scenario: 服务端接受指定 ID 创建
- **WHEN** 服务端接收到 `POST /api/chat` 请求且包含 `conversationId`
- **AND** 数据库中尚无该 ID 对应的会话
- **THEN** 服务端 MUST 使用该 `conversationId` 创建新的 `Conversation` 记录
- **AND** 服务端 MUST 正常处理消息并持久化
