# Tasks: 端到端升级 Chat Parts 与 Transport（AI SDK 6 beta）

> 注意：本变更处于提案阶段；实现必须在提案被明确批准后进入 apply 阶段。

## 实现任务清单（apply 阶段）

- [x] 1. 定义 `ChatPart` union 的最小扩展（`text` + `file`），并更新解析/序列化工具（确保未知 part 可安全降级/忽略）。
- [x] 2. 修改 `POST /api/chat` 请求体验参 schema：
  - [x] 2.1 `conversationId` 变为可选（首条消息可缺省）
  - [x] 2.2 `input` 支持 `ChatPart[]` union（至少 text/file）
  - [x] 2.3 保持 `clientMessageId` 幂等语义不变
- [x] 3. 服务端历史拼接与模型调用适配：
  - [x] 3.1 仅将 `text` parts 进入 prompt（file parts 暂不进入）
  - [x] 3.2 assistant 最终输出落库仍为 `ChatPart[]`
- [x] 4. 客户端发送链路升级：
  - [x] 4.1 `useChat().sendMessage` 采用 `CreateUIMessage`（以 `parts` 为真相源）
  - [x] 4.2 `DefaultChatTransport.prepareSendMessagesRequest` 发送结构化 `input(parts)`（不再压扁为纯文本）
  - [x] 4.3 首条消息场景：收到流内 `conversation_id` 后更新 URL 为 `/chat/c/[id]`
- [x] 5. UI 渲染最小扩展：
  - [x] 5.1 user/assistant 消息渲染支持 file part 的最小可见性（文件名标签/行内展示）
  - [x] 5.2 历史回放时 file part 可见且不破坏现有布局规范
- [ ] 6. 验证路径（手动回归）：
  - [ ] 6.1 新对话 `/chat`：发送首条消息 → URL 更新为 `/chat/c/[id]` → 刷新可回放
  - [ ] 6.2 历史会话 `/chat/c/[id]`：追加消息 → 会话列表排序按 `updatedAt` 更新
  - [ ] 6.3 发送包含 file part 的消息：服务端不报错、DB 可持久化、UI 可见



