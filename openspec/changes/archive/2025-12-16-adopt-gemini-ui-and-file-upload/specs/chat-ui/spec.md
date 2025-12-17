# Delta Spec: adopt-gemini-ui-and-file-upload (chat-ui)

## ADDED Requirements

### Requirement: Multimodal Input with Upload State
聊天输入框 SHALL 支持多模态输入，并在文件上传过程中提供清晰的状态反馈与操作限制。

#### Scenario: 文件上传状态管理
- **WHEN** 用户选择文件
- **THEN** 系统 MUST 立即开始上传文件
- **AND** UI MUST 显示文件预览与加载状态
- **AND** 发送按钮 MUST 被禁用，直到所有文件上传完成或失败文件被移除

### Requirement: Send Message with File References
UI 发送消息时，SHALL 将已上传文件的引用 (`ref`) 包含在消息体中，而非直接发送文件内容。

#### Scenario: 构造带 Ref 的消息
- **WHEN** 用户点击发送
- **THEN** UI MUST 将当前附件列表转换为 `file` 类型的 `ChatPart`
- **AND** 每个 file part MUST 包含上传接口返回的 `ref`

## MODIFIED Requirements

### Requirement: Input Area Integration
输入区域 SHALL 整合文本输入与附件预览，不再将附件作为独立于输入框的外部元素展示（参考 Gemini UI）。

#### Scenario: 附件预览布局
- **WHEN** 存在附件
- **THEN** 附件缩略图 MUST 展示在文本输入框上方或内部

