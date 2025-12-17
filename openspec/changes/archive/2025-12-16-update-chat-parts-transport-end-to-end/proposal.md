# Proposal: 端到端升级 Chat Parts 与 Transport（AI SDK 6 beta）

## 背景 / 现状

当前聊天 UI 已使用 AI SDK 的 `useChat` 与 `DefaultChatTransport`，但客户端在发送消息时仍存在“结构化 parts → 纯文本”的压扁：

- UI 侧以 `parts` 作为消息渲染的真相源（符合 AI SDK 6 的 UIMessage 设计），但请求体构造阶段仅提取 `text` 并拼接。
- 服务端 `POST /api/chat` 对请求体进行强校验，目前仅接受 `input: [{ type: "text", text }]`，无法承载/演进到更丰富的 parts（例如 file parts）。

这导致：

- `sendMessage` 即便可以携带更丰富的 message/parts 形态，最终也会在 transport / API 边界处丢失信息。
- 未来接入 file parts、tool parts、metadata 等能力时，需要反复重构边界，风险较高。

本提案参考 Vercel 官方 AI SDK 6 beta 的整体方向（Transport、UIMessage parts 以及更强的 UI/Agent 能力），在不引入破坏性 UI/路由体验的前提下，先把“parts 端到端”打通并固化契约。

参考：
- Vercel AI SDK 6 Beta 公告与文档：`https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta`

## 目标（Goals）

- **端到端以 parts 为真相源**：客户端发送、服务端验参与持久化、历史回放与渲染，均以结构化 `parts` 为核心。
- **升级 transport 映射**：客户端基于 `useChat().sendMessage` 的能力，允许发送 `CreateUIMessage`（包含 `parts`/`metadata` 等），并由 transport 将其稳定映射为后端请求体。
- **扩展 API 契约以支持演进**：服务端请求体 schema 支持 `input: ChatPart[]` 的可演进 union（先从 `text` + `file` 起步），并维持幂等键 `clientMessageId`。
- **保持服务端为真相源**：服务端继续负责拉取历史、裁剪上下文与落库；客户端不回传全量历史。

## 非目标（Non-goals）

- 不在本变更中引入真实鉴权（仍使用服务端控制的临时 `userId`）。
- 不在本变更中实现“边流边存”（仍以保存最终 assistant 结果为主）。
- 不在本变更中实现真正的文件上传/存储（仅定义 file part 的表达与最小渲染/持久化语义，后续可扩展为对象存储）。
- 不在本变更中引入 Agent/工具审批等高级能力（仅确保契约可演进到这些能力）。

## 范围（Scope）

涉及的 capability：

- `chat-conversation`：消息发送请求体（`conversationId` 可选 + `clientMessageId` + `input(parts)`）与会话懒创建/回传 `conversationId` 的行为约束。
- `chat-storage`：`ChatPart[]` 的 union 演进（至少新增 `file`），以及持久化与回放的最低保证。
- `chat-ui`：客户端发送路径以 `parts` 为真相源，UIMessage parts 的渲染与交互（至少新增 file part 的可见性）。

## 风险与缓解

- **契约升级风险**：API schema 扩展可能影响旧客户端。
  - 缓解：采用向后兼容的请求体（允许旧的 text-only input），并在服务端进行更严格的可观测错误输出。
- **安全风险（文件/元信息）**：file part 可能携带过大数据或敏感字段。
  - 缓解：本期 file part 仅允许元信息（name/mimeType/size/opaque reference），禁止直接落库大块二进制。


