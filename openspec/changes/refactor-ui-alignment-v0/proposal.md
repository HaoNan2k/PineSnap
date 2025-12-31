# Proposal: Refactor UI to Align with v0 Experience

## 1. Background
当前系统的 UI 交互虽然功能完备，但在视觉精致度和多模态信息的展示上与业界标杆（如 v0/菲灵）存在差距。
主要问题：
1. **输入框生硬**：使用深色边框和灰色背景，缺乏现代感和“内容优先”的视觉体验。
2. **多模态信息丢失**：前端在渲染消息时，将结构化的 `parts`（如文件附件）强行合并为纯文本字符串，导致无法渲染文件缩略图或卡片，不仅丑陋且降低了信息可读性。

## 2. Goals
- **提升视觉体验**：重构输入框和消息气泡样式，采用“纯白背景 + 柔和阴影”的 v0 风格。
- **支持结构化渲染**：重构前端消息数据流，保留 `parts` 结构，实现“文本气泡 + 下方文件卡片”的组合布局。
- **增强交互细节**：优化文件上传预览和消息发送的微交互。

## 3. Scope
- **Components**:
    - `components/chat/types/chat.ts`: 扩展 `Message` 接口。
    - `components/chat/components/chat-area.tsx`: 重构数据映射逻辑。
    - `components/chat/components/message-list.tsx`: 支持 `parts` 渲染。
    - `components/chat/components/multimodal-input.tsx`: 样式重写。
- **Data Flow**: 仅限于前端组件间的数据流转（SDK `useChat` -> UI Components），不涉及后端 API 或数据库 Schema 变更。

## 4. Non-Goals
- 引入新的后端存储字段。
- 实现文件的服务端解析逻辑（仅处理 UI 展示）。
