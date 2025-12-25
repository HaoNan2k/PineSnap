# Design: update-conversation-id-default-to-uuid

## 现状

- Prisma schema 中 `Conversation.id` 与 `Message.id` 已配置为 UUID 默认值（例如 `@default(uuid(...))`）。
- `/api/chat` 请求体中 `conversationId` 的校验与行为需要与上述默认策略一致。

## 设计决策

- **D1**：UUID 作为会话与消息主键的默认格式（存储与 URL 形态统一）。
- **D2**：客户端在新对话页生成 UUID 作为“稳定会话键”，服务端在懒创建时复用该 UUID（避免首条消息后再“换 id”导致的导航/中断问题）。
- **D3**：服务端仍 MAY 支持请求体不包含 `conversationId` 的懒创建路径，但该路径 MUST 仅用于兼容/容错，不作为主路径依赖。


