# Delta Spec: adopt-ai-chatbot-ui（chat-ui）

## MODIFIED Requirements

### Requirement: User message visual layout
UI SHALL 将用户消息渲染为靠右对齐的消息气泡，并且 MUST NOT 显示用户头像。

#### Scenario: 用户消息 - 基线（无头像）
- **WHEN** 展示用户消息
- **THEN** 消息 MUST 右对齐
- **AND** MUST 使用圆角气泡容器
- **AND** MUST NOT 显示用户头像（不论是否存在用户信息）

#### Scenario: 用户消息 - 复制操作
- **WHEN** 展示用户消息
- **THEN** 在消息内容下方 MUST 提供复制操作
- **AND** 复制操作 MUST 在键盘聚焦时可见与可触达

### Requirement: Assistant message document layout
UI SHALL 将 assistant 消息渲染为“文档流”布局：使用左侧小圆图标作为身份标识，并且 MUST NOT 使用消息气泡包裹正文内容。

#### Scenario: 助手消息 - 基线（图标 + 文档流）
- **WHEN** 展示 assistant 消息
- **THEN** MUST 显示一个左侧小圆图标用于身份标识
- **AND** 内容 MUST 以文档流方式渲染（段落间距、Markdown 块）
- **AND** 内容 MUST NOT 包裹在聊天气泡中

#### Scenario: 助手消息 - 复制操作
- **WHEN** 展示 assistant 消息
- **THEN** 在该条 assistant 内容底部 MUST 提供复制操作
- **AND** 复制操作 MUST 在键盘聚焦时可见与可触达

### Requirement: Core states styling consistency
UI SHALL 为 jump-to-bottom（回到底部）提供一致的样式语言，并在流式输出与内容高度变化时提供稳定的自动滚动策略。

#### Scenario: 跳到底部按钮 - 显示与位置
- **WHEN** 用户滚动离开消息列表底部
- **THEN** UI MUST 显示居中圆形的下箭头按钮
- **AND** 点击按钮 MUST 平滑滚动到底部

#### Scenario: 自动滚动 - 用户在底部时 instant 跟随
- **WHEN** 用户处于消息列表底部
- **AND** assistant 正在流式输出，或消息内容高度发生变化（例如代码块/图片加载）
- **THEN** UI MUST 以 instant 方式跟随到底部以避免抖动

#### Scenario: 自动滚动 - 用户上滑阅读时不抢滚动
- **WHEN** 用户上滑离开底部阅读历史消息
- **THEN** UI MUST NOT 自动拉回到底部

## ADDED Requirements

### Requirement: Assistant markdown rendering uses Streamdown
UI SHALL 使用 Streamdown 渲染 assistant 文本输出，以支持 streaming 场景下的稳定 Markdown 渲染，并对 code/pre 溢出提供合理默认样式。

#### Scenario: 代码块不撑爆布局
- **WHEN** assistant 输出包含代码块（```）
- **THEN** pre/code MUST 不撑爆消息容器宽度
- **AND** 水平方向溢出 MUST 通过滚动或换行策略处理

## References
- 参考实现：`vercel/ai-chatbot`（Sidebar、Messages、use-scroll-to-bottom、Response/Streamdown）




