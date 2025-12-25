# Proposal: 简化新对话流并对齐 ai-chatbot 的会话/URL 模式

## 背景

当前实现为了让聊天区域在 layout 中常驻，引入了 `ConversationRuntimeProvider` / `ConversationInitializer` 等同步机制。实践中暴露出两个高频问题：

- **P1**：客户端 `POST /api/chat` 经常未携带 `conversationId`，导致服务端每条消息都走“首条懒创建”分支，从而 **每条消息新建一个会话**。
- **P2**：首条消息后通过 Next Router 导航到 `/chat/c/[id]`，触发组件重置/停止流式，导致 **后端在生成但前端看不到回复**。

同时，对照参考项目 `ai-chatbot`，其新对话流更简单：在进入新对话页就生成稳定 ID；首条发送仅改 URL（History API），不触发真实导航，从而保持 React 树与流式连续。

## 目标

- **G1**：新对话状态下，客户端 MUST 始终携带稳定的 `conversationId` 发送消息（首条也包含）。
- **G2**：首条发送后 URL 更新 MUST 不触发真实导航（避免卸载/重置导致流中断）。
- **G3**：删除 `ConversationRuntimeProvider` / `ConversationInitializer`，将聊天实例生命周期收敛到页面（`/chat` 与 `/chat/c/[id]`）。
- **G4**：保持 sidebar 使用 SWR + DataStream 的刷新机制（`mutate('/api/conversations')`）。

## 非目标

- 不改变 `/api/chat` 的核心存储与流式协议（仍使用 UIMessageStream data parts）。
- 不引入真实鉴权（继续使用服务端控制的临时 `userId`）。
- 不实现可恢复流（若未来需要再单独提案）。

## 风险与回滚

- **风险**：改变 ChatArea 挂载位置可能影响某些依赖“layout 常驻”的交互（例如右侧面板联动）。
- **回滚**：保留现有实现分支，必要时恢复 provider/initializer 并放宽导航策略。


