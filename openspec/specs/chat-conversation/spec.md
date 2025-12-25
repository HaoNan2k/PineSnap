# chat-conversation Specification

## Purpose
本规范定义会话路由、URL 深链、会话创建时机与“会话相关 UI 状态（例如当前会话高亮）”在跨页面导航下的一致性约束。
## Requirements
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

### Requirement: Client URL synchronization MUST NOT interrupt streaming
系统 SHALL 在“新对话”首条消息发送后将 URL 同步到 `/chat/c/[id]`，但 MUST NOT 通过真实导航（Next Router 导航）来完成该同步，以避免卸载/重置导致的流式中断。

#### Scenario: 首条发送后仅更新地址栏
- **WHEN** 用户在 `/chat` 发送首条消息并进入流式响应
- **THEN** 客户端 MUST 使用 `window.history.replaceState` 或 `window.history.pushState` 将 URL 更新为 `/chat/c/[conversationId]`
- **AND** 客户端 MUST NOT 通过 Next Router 导航（例如 `router.push` / `router.replace`）完成该 URL 更新
- **AND** 客户端 MUST 保持当前 React 树与流式响应不中断

#### Scenario: 历史会话页面刷新可恢复
- **WHEN** 用户在 `/chat/c/[id]` 刷新页面或直接访问深链
- **THEN** 系统 MUST 以该 `id` 加载会话历史并渲染
- **AND** 若该会话不存在或无权限，系统 MUST 返回对应错误状态（例如 404/403）

### Requirement: Lazy conversation creation before streaming
系统 SHALL 采用懒创建；在首条消息开始流式输出前，服务端 MUST 创建持久化会话并尽早回传真实 `conversationId`。

#### Scenario: 首条消息触发会话创建
- **WHEN** 客户端在“新对话”状态发送首条消息（请求不携带 `conversationId`）
- **THEN** 服务端 MUST 创建新的 `Conversation`
- **AND** 服务端 MUST 创建一条用户 `Message`
- **AND** 服务端 MUST 在开始流式输出前，通过流内元信息（UIMessageStream data part）返回真实 `conversationId`
- **AND** 客户端 MUST 使用该 `conversationId` 将 URL 更新为 `/chat/c/[id]`

#### Scenario: 首条消息主路径 MUST 携带 conversationId（对齐实现）
- **WHEN** 客户端在“新对话”状态发送首条消息
- **THEN** 请求体 MUST 包含 `conversationId`（UUID）
- **AND** 服务端 MUST 使用该 `conversationId` 作为 `Conversation.id`（必要时创建会话）
- **AND** 后续所有消息请求 MUST 复用同一个 `conversationId`

### Requirement: Sidebar active conversation MUST follow current URL
系统 SHALL 以当前 URL 为“当前会话”的单一判断依据，并将该状态用于侧边栏（sidebar）的 active 高亮。

#### Scenario: 侧边栏高亮当前会话
- **WHEN** 当前 URL 为 `/chat/c/[id]`
- **THEN** sidebar MUST 将会话 `id` 对应的条目渲染为 active 状态

#### Scenario: 新对话页不高亮历史会话
- **WHEN** 当前 URL 为 `/chat`
- **THEN** sidebar MUST 不高亮任何历史会话条目

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

