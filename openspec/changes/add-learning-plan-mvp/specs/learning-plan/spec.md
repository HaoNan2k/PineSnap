# learning-plan（Delta Spec）

## ADDED Requirements

### Requirement: Learning session MUST use resourceId as the MVP identifier
系统 SHALL 在 MVP 阶段使用 `resourceId` 作为学习会话的唯一标识，并贯穿澄清、Plan 与互动阶段。

#### Scenario: URL uses resourceId
- **WHEN** 用户访问学习入口
- **THEN** 系统 MUST 使用 `/learn/[resourceId]` 作为会话入口
- **AND** 该 `resourceId` MUST 作为后续 API 请求的标识

#### Scenario: Session is memory-only in MVP
- **WHEN** 进入 MVP 学习流程
- **THEN** 系统 MUST 仅使用内存态保存会话数据
- **AND** 系统 MUST NOT 持久化到数据库

### Requirement: Clarification stage MUST produce three questions
系统 SHALL 在开始学习后生成 3 条澄清问题，以明确学习目标。

#### Scenario: Start triggers clarification
- **WHEN** 用户点击 Start 进入学习流程
- **THEN** 系统 MUST 生成 3 条澄清问题文本

### Requirement: Plan MUST be text-only Markdown
系统 SHALL 以纯文本（Markdown）形式产出学习计划，不要求结构化 UI。

#### Scenario: Plan is generated from answers
- **WHEN** 用户提交澄清答案
- **THEN** 系统 MUST 生成 Plan 文本（Markdown）

### Requirement: Interaction MUST be a right-side text panel with input
系统 SHALL 使用右侧交互区展示文本与输入框，以推进 Plan 之后的对话。

#### Scenario: Right panel renders Markdown
- **WHEN** 系统进入互动阶段
- **THEN** 右侧交互区 MUST 渲染 Markdown 文本
- **AND** 交互区 MUST 提供输入框

### Requirement: MVP MAY use non-streaming model calls
系统 SHALL 允许在 MVP 阶段以非流式方式调用模型，以降低实现复杂度。

#### Scenario: Non-streaming response
- **WHEN** 系统发起模型调用
- **THEN** 系统 MAY 以一次性文本响应完成该调用
