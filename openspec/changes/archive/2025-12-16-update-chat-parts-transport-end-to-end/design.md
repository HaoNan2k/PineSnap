# Design: 端到端升级 Chat Parts 与 Transport（AI SDK 6 beta）

## 术语

- **UIMessage**：AI SDK UI 层消息结构，核心字段为 `parts`（用于 UI 渲染）。
- **ChatPart**：本项目用于“请求/持久化/回放”的内部结构化 part 表示（存储在 PostgreSQL `jsonb`）。
- **Transport**：客户端 `useChat` 与服务端 API 之间的传输适配层，负责将 UIMessage/发送参数映射为 HTTP 请求，并解析 UIMessageStream 响应。

参考（方向性，不照抄实现细节）：
- `https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta`

## 现状问题（事实）

### 客户端

- UI 内部以 `parts` 渲染消息，但发送阶段会将 `parts` 压扁为单一字符串（仅保留 text），导致 non-text parts 无法端到端传输。

### 服务端

- `POST /api/chat` 当前请求体 schema 仅接受 text parts（`{ type: "text", text }`），无法承载 file parts 等可演进结构。

## 目标行为（To-be）

### 客户端发送（UI → API）

- 客户端 SHALL 以 `parts` 为真相源构造用户消息（使用 `useChat().sendMessage` 的 `CreateUIMessage` 形态）。
- Transport SHALL 将“待发送的用户 message”映射为请求体：
  - `conversationId?: string`（首条消息可缺省）
  - `clientMessageId: string`（UUID，幂等键）
  - `input: ChatPart[]`（结构化 parts；最小支持 `text` 与 `file`）

### 服务端处理（API → DB → Model → Stream）

- 服务端 MUST 以 `clientMessageId` 实现幂等：重试相同 `clientMessageId` 不重复写入首条用户消息/不重复创建会话。
- 若请求不携带 `conversationId`：
  - 服务端 MUST 在开始流式输出前创建新的 `Conversation`
  - 服务端 MUST 在 UIMessageStream 的 data part 中尽早回传真实 `conversationId`
- 服务端 MUST 持久化用户消息 `parts`（`ChatPart[]` 的 JSON 表示）。
- 服务端调用模型时：
  - 当前阶段 SHOULD 仅将 `text` parts 用作 prompt（file parts 暂不进入上下文，避免引入文件处理/上传/注入风险）
- assistant 输出：
  - 仍按“最终结果落库”为主（不要求边流边存）

### 回放与渲染（DB → UI）

- 从 DB 读取历史消息时，系统 MUST 能将 `ChatPart[]` 转为 UIMessage `parts`，并在 UI 中可见：
  - `text`：按原逻辑渲染
  - `file`：至少以“文件卡片/标签”的形式展示（仅元信息）

## 数据模型（概念）

### ChatPart（建议的最小 union）

本期将 `ChatPart` 从单一 text 扩展为可演进 union（先落地 `text` 与 `file`）。

- `text`
  - `type: "text"`
  - `text: string`
- `file`（仅元信息，避免落库大块数据）
  - `type: "file"`
  - `name: string`
  - `mimeType?: string`
  - `size?: number`
  - `ref?: string`（可选：不透明引用，后续接入对象存储再定义）

注意：存储层使用 `jsonb`，因此 schema 演进不要求立刻更改数据库结构，但需要 **类型/解析/校验** 端到端跟进。

## API 契约（概念）

### `POST /api/chat`

请求体：
- `conversationId?: string`
- `clientMessageId: string`（UUID）
- `input: ChatPart[]`

响应：
- UIMessageStream（沿用）
- 在首条消息（无 `conversationId`）场景下，服务端 MUST 在开始流式输出前通过 data part 回传真实 `conversationId`（例如 `data-conversation_id`）。

## 关键取舍

- **为什么不直接把 UIMessage 全量发给服务端？**
  - 本项目的服务端为真相源，且服务端需要稳定、可演进的“持久化/上下文拼接输入”结构。`ChatPart[]` 是本项目内部契约，保持清晰的边界更利于演进与安全审计。
- **为什么 file part 只存元信息？**
  - 避免把二进制/大对象塞进 Postgres `jsonb`；也避免把未授权的内容注入模型上下文。本期只定义最小可见性与可演进字段，后续接入上传/对象存储再扩展 `ref/url`。


