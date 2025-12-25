# Proposal: 将 Conversation/Message 默认 ID 改为 UUID 并允许客户端提供 UUID

## 背景

早期实现中，会话与消息的 `id` 生成策略未明确约束，导致以下风险：

- 服务端与客户端分别生成 ID 时，可能出现格式不一致（例如 cuid vs uuid）
- 新对话首条消息如果依赖服务端生成会话 ID，前端 URL/状态同步会变复杂
- 不同链路（/api/chat、/api/conversations）对会话 ID 的假设不一致，增加 bug 发生概率

本项目希望对齐 `ai-chatbot` 的实践：客户端可在进入新对话时生成 UUID 作为“稳定会话键”，服务端在懒创建时复用该 UUID 作为 DB 主键，避免“每条消息新建会话”等问题。

## 目标

- **G1**：`Conversation.id` 与 `Message.id` 默认生成策略为 UUID。
- **G2**：服务端在创建 `Conversation` 时 MAY 接受客户端提供的 UUID，并将其作为 `Conversation.id`。
- **G3**：对外接口中 `conversationId` 的校验与存储契约统一为 UUID。

## 非目标

- 不引入鉴权系统（继续使用服务端控制的临时 `userId`）。
- 不改变消息 `parts` 的结构化存储模型。

## 风险与回滚

- **风险**：若历史数据存在非 UUID 的 id，可能导致校验失败或兼容性问题。
- **回滚**：可放宽校验（允许非 UUID），或仅在新会话上启用 UUID 默认策略。


