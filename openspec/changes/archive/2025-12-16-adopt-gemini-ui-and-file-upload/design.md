# Design: Multimodal Input 与上传架构

## 1. 交互流程 (UI State Machine)

用户交互状态机如下：

1.  **Idle**: 输入框为空，无附件。
2.  **Selecting**: 用户点击回形针或拖拽文件。
3.  **Uploading**:
    *   文件加入 `uploadQueue`。
    *   UI 显示加载/预览占位。
    *   **发送按钮禁用**。
    *   后台并发调用 Upload API。
4.  **Ready**:
    *   所有文件上传成功，移入 `attachments` 列表（包含 `url` 和 `ref`）。
    *   `uploadQueue` 清空。
    *   发送按钮启用（如果有文本或附件）。
5.  **Sending**:
    *   用户点击发送。
    *   触发 `onSend`，传递 text 和 attachments。
    *   UI 清空输入框和附件列表。
    *   UI 立即显示乐观更新的消息（含文件预览）。

## 2. API 契约

### `POST /api/files/upload`

- **Request**: `FormData` 包含 `file` 字段。
- **Response (Success)**:
  ```json
  {
    "url": "http://.../uploads/file.png", // 前端预览用 (public access)
    "ref": "uploads/file.png",             // 后端存储用 (internal key)
    "name": "file.png",
    "contentType": "image/png"
  }
  ```
- **Response (Error)**: 400/500 status with error message.

## 3. 数据流与转换

### 前端 (MultimodalInput -> ChatArea)
组件内部维护 `attachments` 数组：
```ts
type UIFileAttachment = {
  name: string;
  contentType: string;
  url: string; // 用于 img src
  ref: string; // 关键：上传接口返回的 ref
};
```

`onSend` 回调签名更新为：
```ts
(message: { text: string; attachments: UIFileAttachment[] }) => void
```

### 发送 (ChatArea -> SDK)
`handleSend` 接收到 attachments 后，构造 `CreateUIMessage`：
```ts
const parts = [];
if (text) parts.push({ type: 'text', text });
attachments.forEach(att => {
  parts.push({
    type: 'file',
    name: att.name,
    mimeType: att.contentType,
    ref: att.ref, // 显式传递 ref
    url: att.url  // 传递 url 供本地乐观更新预览
  });
});

sendMessage({ role: 'user', parts }); // 让 SDK 生成 ID
```

### Transport 适配
`prepareSendMessagesRequest` 逻辑保持/微调：
- 识别 `type: 'file'` 的 part。
- 确保 `ref` 字段被透传给后端（即 `input` 数组中包含 `ref`）。
- 由于我们在 `sendMessage` 时已经显式构造了带 `ref` 的 parts，Transport 里的“Data URL 过滤逻辑”可能不再需要，或者作为兜底保留。

## 4. UI 组件移植策略
- **MultimodalInput**: 参考 `gemini-chatbot`，但移除 `framer-motion` 依赖，使用 CSS transition 或简单条件渲染。
- **PreviewAttachment**: 移植布局，确保样式匹配。
- **Toast**: 检查项目是否已安装 `sonner` 或 `react-hot-toast`，若无则使用简单的 `alert` 或暂不报错（MVP），或者建议安装 `sonner`。

