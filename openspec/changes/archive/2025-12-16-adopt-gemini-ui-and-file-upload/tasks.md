# Tasks: 实现 Multimodal Input 与上传

- [x] 1. **基础依赖与 API**
  - [x] 1.1 安装 `sonner` (可选，用于错误提示) 或确认现有 Toast 机制 (暂用 console)。
  - [x] 1.2 实现 `POST /api/files/upload`，调用 `fileStorage.save` 并返回 `{ url, ref, ... }`。

- [x] 2. **UI 组件移植**
  - [x] 2.1 创建 `PreviewAttachment` 组件 (显示缩略图/Loading)。
  - [x] 2.2 创建 `MultimodalInput` 组件 (管理 `input`, `attachments`, `uploadQueue` 状态)。
  - [x] 2.3 在 `MultimodalInput` 中实现文件选择与自动上传逻辑。

- [x] 3. **集成 ChatArea**
  - [x] 3.1 更新 `ChatArea` 的 `handleSend` 以接收 `attachments`。
  - [x] 3.2 在 `handleSend` 中将 `attachments` 转换为带 `ref` 的 `ChatPart[]` 并调用 `sendMessage`。
  - [x] 3.3 替换 `ChatArea` 中的旧 `MessageInput` 为 `MultimodalInput`。

- [x] 4. **验证**
  - [x] 4.1 发送纯文本：正常。
  - [x] 4.2 发送图片：选择 -> 预览显示 -> 上传完成 -> 发送 -> 消息列表显示 -> 刷新页面回放正常 (后端 Ref 校验通过)。
  - [x] 4.3 混合发送：文本+图片正常。
