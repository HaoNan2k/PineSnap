# Proposal: 引入 Multimodal Input 与文件上传机制

## 背景
当前聊天系统后端已支持文件引用 (`ref`) 存储，但前端缺乏文件上传能力与现代化的交互体验（如预览、上传进度、防误触）。
用户选择文件后目前无法发送（后端拒收 Data URL），且界面缺乏反馈。
参考 `gemini-chatbot` 的优秀实践，我们需要补齐这一环。

## 目标
1.  **实现文件上传 API**：提供 `/api/files/upload` 接口，对接本地存储（未来可切云存储），返回文件 `ref`。
2.  **移植并适配 Multimodal Input**：引入类似 `gemini-chatbot` 的输入组件，支持：
    *   文件选择与拖拽（可选）。
    *   上传队列管理与进度状态。
    *   附件预览（PreviewAttachment）。
    *   发送拦截（上传未完成时禁用）。
3.  **打通端到端文件发送**：前端上传获 `ref` -> 构造消息 -> Transport 映射 -> 后端落库。

## 范围
- **API**: 新增 `app/api/files/upload/route.ts`。
- **UI 组件**:
  - 新增 `components/chat/components/MultimodalInput.tsx` (替代/重构 MessageInput)。
  - 新增 `components/chat/components/PreviewAttachment.tsx`。
  - 修改 `components/chat/components/ChatArea.tsx` 以集成新输入组件。
- **依赖**: 可能需要 `sonner` (Toast) 或使用现有 UI 反馈机制。

## 风险
- **UI 库差异**：需适配本项目现有的 Tailwind/Shadcn 风格，移除对 `framer-motion` 的强依赖（除非决定引入）。
- **SDK 版本差异**：需确保 `useChat` 的 `append/sendMessage` 调用方式符合 v6 beta 规范（使用 `parts` 而非 `experimental_attachments`，或者在 Transport 层做转换）。

