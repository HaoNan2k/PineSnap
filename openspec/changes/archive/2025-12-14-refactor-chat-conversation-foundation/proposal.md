# Change: 重构聊天会话基础（路由/生命周期/存储/代码结构）

## Summary
本变更将聊天系统按“绿地最佳方案”重新定义为：`/chat` 为新对话入口、`/chat/c/[id]` 为历史会话入口；会话 **懒创建** 且在 **开始流式前**由服务端创建并回传 `conversationId`；客户端仅发送本次输入（结构化 `parts`），服务端从 DB 拉历史并裁剪后调用模型；消息内容以 `ChatPart[]` 形式持久化到 PostgreSQL `jsonb`；并明确代码结构分层（UI / API / 领域服务 / 数据访问）。

## Motivation
- 当前实现存在“会话 ID/消息落库/流式响应”的职责边界不清，导致状态源冲突与竞态风险。
- 项目使用 Vercel AI SDK **beta**，直接把 SDK 内部类型作为持久化 schema 会增加未来升级成本；需要稳定的内部 `ChatPart` 表达。
- 将来一定会做权限：需要把服务端作为会话生命周期与历史拼接的真相源，API 设计必须可演进到“按用户隔离”。
- 后续计划扩展知识管理等模块，因此路由与命名需要预留空间（使用 `/chat` 前缀）。

## Goals
- 明确路由形态：`/chat`（新对话）与 `/chat/c/[id]`（历史对话）。
- 明确入口收口：移除 `/socraticu`，根路径 `/` 默认路由到 `/chat`。
- 明确会话生命周期：懒创建；首条消息发送后服务端创建会话并在开始流式前 **通过流内元信息（A1: UIMessageStream data part）** 尽早回传 `conversationId`。
- 明确数据流：客户端只发送 `input`（结构化 parts）、`clientMessageId`（幂等键）与可选 `conversationId`；服务端拉历史并裁剪后调用模型。
- 明确存储：消息内容使用 `ChatPart[]` 存于 PG `jsonb`；初期只落“最终结果”，不要求边流边存。
- 明确代码结构：`components/chat/**` 仅 UI；`app/api/**` 仅协议/编排；`lib/chat/**` 为领域服务；`lib/db/**` 为数据访问。

## Non-Goals
- 本变更不实现 regenerate（重新生成）能力；仅保留数据模型与协议可演进空间。
- 本变更不定义精确的历史裁剪策略（token/window/摘要），后续单独设计。
- 本变更不引入临时会话（temporary chat）与过期清理。

## Impacted Areas
- 路由：`app/chat/**`
- API：`app/api/chat/**`、`app/api/conversations/**`
- 数据模型：`prisma/schema.prisma`（引入 `jsonb parts` 等）
- 代码结构：`lib/chat/**`、`lib/db/**`、`components/chat/**`


