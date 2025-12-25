# Proposal: adopt-ai-chatbot-ui

## 背景与动机
当前 `next-chat-exercise` 的聊天 UI 已具备基础功能（Sidebar 历史、消息列表、文件上传、流式输出），但整体视觉与交互与目标参考项目 `vercel/ai-chatbot` 仍存在明显差异：

- Sidebar：缺少统一的 Sidebar UI 基础设施（移动端抽屉、cookie 记忆、键盘快捷键、统一的 Menu/Button 样式体系）。
- 消息列表：jump-to-bottom 的体验与样式不一致，且在流式输出/内容高度变化时的“跟随到底部”策略不够稳定。
- 消息样式：User/Assistant 的头像与气泡策略与目标不一致。
- Assistant 文本渲染：目前基于 `react-markdown`，计划切换到 `Streamdown` 以更贴合 streaming 渲染场景。

本变更将以 `vercel/ai-chatbot` 为 UI/交互参考，将聊天页面整体迁移为一致的视觉语言。

## 目标（Goals）
- **整套迁移 Sidebar UI 基础设施**：采用 `SidebarProvider + Sidebar + SidebarInset` 体系，支持移动端抽屉、cookie 记忆、`Cmd/Ctrl+b` 快捷键。
- **消息列表对齐 ai-chatbot 交互**：
  - 使用居中圆形下箭头作为 jump-to-bottom。
  - 流式输出/内容变化时，仅在用户处于底部且未主动滚动时“瞬间跟随到底部（instant）”。
- **消息样式对齐**：
  - User：右侧蓝色气泡。
  - Assistant：左侧小圆图标（AI 身份标识），正文为透明文档流（不使用气泡包裹）。
  - User 与 Assistant 均不显示“头像”（用户明确不需要头像；AI 使用小图标作为身份标识，不等同头像）。
- **Assistant Markdown 渲染切换为 Streamdown**：对齐 ai-chatbot 的 code/pre 溢出与换行策略。
- **只保留 Copy 操作**：不引入赞踩/编辑/regenerate 等扩展操作。

## 非目标（Non-goals）
- 不引入/实现 `Delete all chats`（含 AlertDialog）。
- 不改变路由形态、API 契约、DB schema、权限模型。
- 不保留旧 UI 的兼容层/双实现并存（直接替换）。

## 范围（Scope）
- 影响 capability：`chat-ui`（主要为视觉与交互规范变更）。
- 影响页面：`/chat` 新对话与 `/chat/c/[id]` 历史对话的 UI 结构与消息渲染。

## 成功标准（Success metrics）
- Sidebar：桌面端可折叠；移动端为抽屉；开合状态在刷新后保持；`Cmd/Ctrl+b` 可切换。
- 消息列表：
  - 不在底部时出现居中圆形下箭头；点击后平滑滚动到底部。
  - 在底部时流式输出稳定跟随；用户上滑阅读历史时不会被强行拉回。
- 消息样式：User 蓝色气泡；Assistant 左侧小圆图标 + 文档流正文（无气泡底）。
- 文本渲染：使用 Streamdown；代码块不撑爆宽度；lint/类型检查通过，无 any。
- @Browser 验证：使用浏览器实际操作验证 Sidebar 与消息滚动交互符合预期（见 tasks.md 的验证清单）。

## 约束（Constraints）
- **允许直接抄参考实现的核心代码**（`vercel/ai-chatbot`），但 **MUST 移除冗余与重复实现**：
  - MUST 不保留旧 UI 的兼容分支/双组件体系并存。
  - MUST 删除未使用的组件与样式逻辑，确保代码路径单一可维护。
  - MUST 保持类型安全（无 `any`），并通过 lint。

## 参考实现（Reference）
- `vercel/ai-chatbot`
  - Sidebar：`components/ui/sidebar.tsx`、`app/(chat)/layout.tsx`、`components/app-sidebar.tsx`
  - 消息列表与 jump-to-bottom：`components/messages.tsx`、`hooks/use-scroll-to-bottom.tsx`
  - 消息样式：`components/message.tsx`
  - Streamdown：`components/elements/response.tsx`



