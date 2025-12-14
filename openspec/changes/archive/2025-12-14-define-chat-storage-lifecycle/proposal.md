# Change: 定义聊天存储与生命周期

## 状态
本变更已被后续变更 **`refactor-chat-conversation-foundation`** 取代：该后续变更将路由、懒创建时机（开始流式前回传 `conversationId`）、服务端拼接历史、以及 `jsonb ChatPart[]` 持久化等作为新的实现依据。

除非明确需要回溯历史讨论，否则**不要再以本变更作为实现依据**。

## 为什么
当前应用的聊天消息主要是内存态/临时态表示（例如使用 AI SDK 的 `UIMessage`），缺少持久化存储。为了支持历史记录、会话恢复、多轮对话与后续扩展（例如分叉/回溯），需要定义清晰的存储结构与生命周期管理方案，并参考 LibreChat 的成熟实现。

## 变更内容
- **数据库结构**：引入 `Conversation` 与 `Message` 模型（参考 LibreChat 的 MongoDB schema，但适配关系型数据库/Prisma）。
- **生命周期逻辑**：定义会话何时创建（首次发送消息时创建）、消息如何追加与关联。
- **API 约束**：定义保存与读取会话历史所需的接口要求。

## 影响范围
- **受影响的规格**：`chat-storage`（新增能力）。
- **受影响的代码**：`schema.prisma`（待创建/更新）、`app/api/chat/route.ts`、数据库服务层。

