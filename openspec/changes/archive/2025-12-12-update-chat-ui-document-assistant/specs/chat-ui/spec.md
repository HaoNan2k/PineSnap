## ADDED Requirements

### Requirement: User message visual layout
UI SHALL 将用户消息渲染为靠右对齐的消息气泡，并在气泡旁显示用户头像。

#### Scenario: 用户消息 - 基线
- **WHEN** 展示用户消息
- **THEN** MUST 右对齐
- **AND** MUST 使用圆角气泡容器
- **AND** 用户头像 MUST 与气泡在视觉上建立关联（相邻）

#### Scenario: 用户消息 - 复制操作
- **WHEN** 展示用户消息
- **THEN** MUST 在消息内容下方提供复制操作
- **AND** 复制操作 MUST 相对消息块靠左对齐

### Requirement: Assistant message document layout
UI SHALL 将 assistant 消息渲染为“文档流”布局：不显示头像，也不使用消息气泡包裹。

#### Scenario: 助手消息 - 基线
- **WHEN** 展示 assistant 消息
- **THEN** MUST 不显示 assistant 头像
- **AND** MUST 以文档流方式渲染内容（段落间距、Markdown 块）
- **AND** MUST NOT 将内容包裹在聊天气泡中

#### Scenario: 助手消息 - 复制操作
- **WHEN** 展示 assistant 消息
- **THEN** MUST 在该条 assistant 内容底部提供复制操作
- **AND** 复制操作 MUST 靠左对齐

### Requirement: Composer integration without dividers
UI SHALL 不使用水平分割线来区分消息区域与输入框（composer）。

#### Scenario: 无水平分割线
- **WHEN** 聊天视图渲染
- **THEN** MUST 不存在用于分割消息列表与输入框的边框线
- **AND** 如需分隔感，SHALL 使用留白与轻微层级（背景/阴影）等方式实现

### Requirement: Core states styling consistency
UI SHALL 为空态、加载态、错误态、跳到底部（jump-to-bottom）提供一致的样式语言。

#### Scenario: 空态
- **WHEN** 消息数量为 0
- **THEN** MUST 显示克制的空态（排版与留白）

#### Scenario: 加载态
- **WHEN** assistant 正在生成
- **THEN** MUST 以 assistant 文档流风格显示打字指示器

#### Scenario: 错误态
- **WHEN** 请求失败
- **THEN** MUST 显示错误信息且不引入强分割线
