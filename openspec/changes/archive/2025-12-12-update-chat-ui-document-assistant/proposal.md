# Change: 更新聊天 UI（User 气泡 + 头像 / Assistant 文档流，无分割线）

## 为什么
当前聊天 UI 更像“带头像的对话列表”，而目标 UI 需要更像“文档阅读 + 轻量输入”的体验：更干净、更少分割线、更强内容可读性，并匹配参考 UI（user 气泡在右，assistant 为文档流）。

## 变更内容
- User 消息：
  - 仅保留「头像 + 消息气泡」语义（去掉标题行 "You"）。
  - 整体靠右布局；头像在气泡右侧。
  - 气泡为浅灰描边/填充，圆角更大（与输入框一致或更大）。
  - 复制按钮放在消息下方，靠左对齐（相对气泡/消息块）。
- Assistant 消息：
  - 移除头像与标题行，渲染为“文档流”：全文宽度稳定、段落间距更自然。
  - 复制按钮位于该条 Assistant 内容底部，靠左对齐。
- 结构与分割线：
  - 移除聊天区顶部栏的 `border-b` 与输入区的 `border-t`（以及其他强分割线）。
  - 用留白、轻阴影/背景层级替代分割线；输入框可做轻浮层效果（subtle shadow + rounded）。
- 视觉系统（白色系为主）：
  - 调整 token 让页面以白为主、灰为辅（背景更白，边框更淡，强调色保持克制）。
  - 聚焦态（focus ring）、悬浮态（hover）、禁用态（disabled）统一规范。
- 交互与状态：
  - 空态、生成中（typing）、错误提示、Jump to bottom 的样式统一为轻量组件语言（不抢内容）。

## 影响范围
- 受影响的 specs: `openspec/changes/update-chat-ui-document-assistant/specs/chat-ui/spec.md`
- 受影响的代码:
  - `components/chat/components/ChatArea.tsx`
  - `components/chat/components/MessageList.tsx`
  - `components/chat/components/MessageRow.tsx`
  - `components/chat/components/MessageInput.tsx`
  - `components/chat/components/MarkdownContent.tsx`
  - `app/globals.css`
