## 1. 数据库结构
- [ ] （已被取代）本变更已被 `refactor-chat-conversation-foundation` 取代；以下任务列表不再作为实现依据。
- [ ] 1.1 安装 Prisma（如尚未安装）并初始化。
- [ ] 1.2 在 `schema.prisma` 中定义 `Conversation` 与 `Message` 模型。
- [ ] 1.3 运行 migration 创建表结构。

## 2. 后端 API
- [ ] 2.1 更新 `POST /api/chat`：支持 `conversationId` 参数。
- [ ] 2.2 实现新会话创建逻辑：当 `conversationId` 缺失或为 "new" 时创建 `Conversation`。
- [ ] 2.3 实现消息落库：保存用户消息与 assistant 消息（结合 AI SDK 的回调/流式输出）。
- [ ] 2.4 新增 `GET /api/chat/[id]`：用于拉取会话历史。

## 3. 前端集成
- [ ] 3.1 更新 `ChatArea`：区分 "new" 与已存在会话的状态。
- [ ] 3.2 更新 `useChat` 的用法：在可用时传入会话 `id`。
- [ ] 3.3 支持导航到 `/chat/[id]` 时自动加载历史消息。

