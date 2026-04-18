## ADDED Requirements

### Requirement: Discussion sidebar replaces chat drawer in learning page
UI SHALL 在 learning 页面提供一个右侧 collapsible sidebar 用于讨论交互，**取代**现有的 right-slide chat drawer。Sidebar 的存在 MUST NOT 挤压 canvas 主区域的高度，仅占用宽度。

#### Scenario: 默认收起态
- **WHEN** 用户首次访问某 learning
- **THEN** sidebar MUST 处于收起态，仅展示一条窄竖条（宽度约 32px），含 "?" 图标
- **AND** canvas 区域 MUST 占用屏幕剩余宽度

#### Scenario: 展开态
- **WHEN** 用户点击窄竖条 / "?" 图标
- **THEN** sidebar MUST 平滑展开为宽度约 360px
- **AND** canvas 区域 MUST 自然让出宽度（flex-1）但不调整高度
- **AND** 展开过程 MUST 在 200ms 内完成

#### Scenario: 收起触发
- **WHEN** 用户点击 sidebar header 的折叠按钮
- **OR** 按下快捷键
- **THEN** sidebar MUST 收回为窄竖条形态

### Requirement: Sidebar internal layout follows canonical chat panel shape
UI SHALL 在 sidebar 展开态内部按以下垂直布局组织（从上到下）：
1. Header（约 48px 高）：显示 "AI 助教" 或学习主题 + 折叠按钮（**不绑定 canvas 当前 step**）
2. Scroll 区（flex-1）：完整 chat conversation 的 message list，最旧在上、最新在下、自动滚到底
3. Input 区（约 64px 高）：textarea + 发送按钮，**固定在 sidebar 内底部**

#### Scenario: Input 在 sidebar 内底部，不在屏幕底部
- **WHEN** sidebar 展开
- **THEN** input 区 MUST 渲染在 sidebar 容器内的最底部
- **AND** input 区 MUST NOT 横跨 canvas 宽度
- **AND** input 区 MUST NOT 出现在 canvas 区域内

#### Scenario: Header 不绑定 canvas step
- **WHEN** sidebar 展开
- **THEN** header 文本 MUST 是稳定的（如"AI 助教"），不随 canvas step 切换变化
- **AND** sidebar 不显示"关于「某 step」"这样的 step 名

### Requirement: Sidebar shows full discussion timeline regardless of canvas navigation
UI SHALL 在 sidebar 内显示完整的 chat conversation 时间线，**不按 canvas current step 过滤**。用户翻 previous 或 next 不会切换 sidebar 显示的 messages。

#### Scenario: 翻 canvas previous 时 sidebar 不变
- **WHEN** 用户在 canvas 上点击 `<` 翻到 step N-1
- **THEN** sidebar 显示的 message 列表 MUST 保持不变
- **AND** sidebar header 文本 MUST 保持不变

#### Scenario: 历史 step 时仍可提问
- **WHEN** 用户停留在历史 step（read-only canvas）
- **AND** 在 sidebar 输入框提交新问题
- **THEN** sidebar MUST 接受输入并发送
- **AND** anchor 元数据 MUST 设为 latest step（不是 displayed step）

### Requirement: Keyboard shortcut to toggle sidebar
UI SHALL 提供键盘快捷键切换 sidebar 展开/收起态。展开时 MUST 自动 focus 输入框。

#### Scenario: 快捷键展开
- **WHEN** sidebar 处于收起态
- **AND** 用户按下快捷键（默认 `Cmd+/` Mac / `Ctrl+/` Win，实施前需 audit 与现有快捷键的冲突）
- **THEN** sidebar MUST 展开
- **AND** input 区 textarea MUST 获得 focus

#### Scenario: 快捷键收起
- **WHEN** sidebar 处于展开态
- **AND** 用户按下相同快捷键
- **THEN** sidebar MUST 收起

## REMOVED Requirements

### Requirement: ChatDrawer right-slide overlay
**Reason**: 由 collapsible sidebar 取代。chat drawer 形态（默认隐藏在屏幕外、点击按钮从右侧滑入 overlay 在 canvas 之上、关闭后完全隐藏）与新设计冲突——新 sidebar 默认露出窄条、展开时占用宽度而非 overlay。
**Migration**: 删除 `components/learn/chat-drawer.tsx` 与 `toDisplayMessages` helper；新代码使用 `components/learn/discussion-sidebar.tsx`。learning 页面的 `LearnFocus` 组件不再 import 或渲染 ChatDrawer。
