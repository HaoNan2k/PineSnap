# chat-conversation（delta）

## ADDED Requirements

### Requirement: Chat routes and deep-linking
系统 SHALL 提供一个稳定的聊天入口与可深链的会话地址，以支持刷新恢复与未来权限隔离。

#### Scenario: 新对话入口
- **WHEN** 用户访问 `/chat`
- **THEN** 系统 MUST 进入“新对话”状态
- **AND** 数据库 MUST NOT 仅因访问页面而创建会话记录

#### Scenario: 根路径默认入口
- **WHEN** 用户访问 `/`
- **THEN** 系统 MUST 导航到 `/chat`

#### Scenario: 历史会话入口
- **WHEN** 用户访问 `/chat/c/[id]`
- **THEN** 系统 MUST 加载并展示该 `id` 对应会话的历史消息（按时间顺序）
- **AND** 若该会话不存在或无权限，系统 MUST 返回对应错误状态（例如 404/403）

### Requirement: Lazy conversation creation before streaming
系统 SHALL 采用懒创建；在首条消息开始流式输出前，服务端 MUST 创建持久化会话并尽早回传真实 `conversationId`。

#### Scenario: 首条消息触发会话创建
- **WHEN** 客户端在“新对话”状态发送首条消息（请求不携带 `conversationId`）
- **THEN** 服务端 MUST 创建新的 `Conversation`
- **AND** 服务端 MUST 创建一条用户 `Message`
- **AND** 服务端 MUST 在开始流式输出前，通过流内元信息（UIMessageStream data part）返回真实 `conversationId`
- **AND** 客户端 MUST 使用该 `conversationId` 将 URL 更新为 `/chat/c/[id]`

### Requirement: Server is the source of truth for history
系统 SHALL 将服务端视为会话历史与上下文拼接的真相源。

#### Scenario: 客户端仅发送本次输入
- **WHEN** 客户端发送消息请求
- **THEN** 请求体 MUST 仅包含本次输入 `input`、幂等键 `clientMessageId` 与可选 `conversationId`
- **AND** 服务端 MUST 从数据库读取历史并按策略裁剪后再调用模型

### Requirement: Idempotent first message
系统 SHALL 支持在网络重试/重复提交下的幂等行为，避免重复创建会话或重复写入首条用户消息。

#### Scenario: 重试首条消息不重复创建会话
- **WHEN** 客户端在“新对话”状态发送首条消息，并携带固定的 `clientMessageId`
- **AND** 客户端因为网络重试/误触重复提交相同 `clientMessageId`
- **THEN** 服务端 MUST 复用同一个 `Conversation`
- **AND** 服务端 MUST NOT 重复写入该首条用户 `Message`


