# Spec Delta: refactor-ui-alignment-v0 (chat-ui)

## MODIFIED Requirements

### Requirement: Message rendering separates text bubble and file attachments
系统 MUST 支持结构化消息内容（包含 text 与 file parts），并满足以下渲染约束：
- text parts MUST 渲染在主消息气泡内
- file parts MUST 以附件卡片/缩略图形式渲染在主气泡之外（下方）

#### Scenario: User sends text + file
- **GIVEN** 用户选择了文件 `image.png`
- **WHEN** 用户发送消息文本 `Check this out`
- **THEN** 聊天历史 MUST 显示：
  - 一个包含 `Check this out` 的文本气泡
  - 一个位于文本气泡下方的文件卡片，展示 `image.png`（若为图片可展示缩略图）
- **AND** 文件卡片 MUST NOT 出现在文本气泡内

#### Scenario: Load history with file attachments
- **GIVEN** 已存在包含文件附件的会话历史（消息 `parts` 持久化在 `jsonb` 中）
- **WHEN** 页面加载会话历史
- **THEN** `ChatArea` MUST 将存储的 `parts` 正确映射为前端 `MessagePart`（保留结构化语义）
- **AND** `MessageList` MUST 将 file parts 渲染为独立附件元素（而不是字符串化文本）

### Requirement: Input area aligns with v0 visual style
输入区域 MUST 对齐 “v0” 视觉风格：
- 默认态：白色背景、细灰边框、轻微阴影
- 聚焦态：白色背景、略加强的边框/阴影、无浏览器默认 outline
- 文本域：透明背景、无边框

#### Scenario: Input has correct default and focus visuals
- **WHEN** 输入框处于默认状态
- **THEN** UI MUST 满足默认态样式约束
- **WHEN** 用户聚焦输入框
- **THEN** UI MUST 满足聚焦态样式约束且不显示默认 outline
