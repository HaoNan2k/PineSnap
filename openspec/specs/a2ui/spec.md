# Spec: A2UI Interaction

## Purpose
Define A2UI tool-call rendering and interaction rules for learning flows.
## Requirements
### Requirement: System SHALL support guided quiz tool-calls

系统 SHALL 允许 AI 在讲解后调用 A2UI 工具（如 `renderQuizSingle`）以呈现交互题目。用户提交 tool-result 后，AI SHALL 基于结果继续生成反馈。

#### Scenario: Guided quiz with single-choice tool
Given 用户正在学习某个知识点
When AI 输出讲解内容并调用 `renderQuizSingle`
Then UI SHALL 显示一个单选题组件
When 用户选择一个选项并点击提交
Then 该组件 SHALL 进入只读状态
And AI SHALL 基于 tool-result 输出反馈

### Requirement: System SHALL support batch submit for parallel A2UI tools

系统 SHALL 支持在一条 assistant 消息中包含多个 A2UI 工具调用，并允许用户一次性提交该消息内所有待提交工具的结果（Batch Submit）。

#### Scenario: Batch submit multiple tools in one message
Given AI 决定进行一次综合复习
When AI 在同一条回复中调用 `renderQuizMultiple` 与 `renderFillInBlank`
Then UI SHALL 展示多个组件并提供统一的"提交答案"入口
When 用户完成所有作答并点击提交
Then 所有组件 SHALL 同时锁定
And AI SHALL 对综合表现进行点评

### Requirement: A2UI renderer MUST fail gracefully for unknown tools

当 UI 无法找到与 toolName 对应的组件时，系统 MUST NOT 崩溃，并应回退到可理解的文本提示，指导用户用文本作答。

#### Scenario: Unknown tool name renders fallback text
Given AI 输出了一个未知的 toolName
When 渲染层查找不到对应组件
Then UI SHALL 显示提示文本说明该交互组件暂不支持

### Requirement: Learn SHALL render a clean new assistant bubble after tool submit

Learn 在用户提交 tool-result 后触发的新一轮 assistant 回复，SHALL 作为独立消息呈现，并且 MUST NOT 显示上一轮继承的内容（尤其是工具 UI）。

#### Scenario: No inherited UI is visible in the new round
Given 用户在 Learn 中收到一条 assistant 消息，其中包含 A2UI 工具 UI（tool-call）
And 用户在该消息中提交 tool-result
When 系统触发下一轮 AI 回复并开始流式响应
Then 新一轮的 assistant 消息气泡 MUST NOT 渲染上一轮继承的 UI（包括 tool UI 与旧文本残留）
And 仅当本轮出现“有效输出”（例如首个 token / tool-call / 可展示 part）后，新消息才允许显示真实内容
And 系统 SHALL 通过“当前 parts 相对上一条 assistant（或基线 snapshot）的差异”判定有效输出
And 若当前 parts 与基线 snapshot 未发生变化，新消息 MUST 保持被门控（不渲染真实内容）

### Requirement: Learn SHALL update previous tool UI state immediately and persistently

在用户提交 tool-result 时，上一轮包含工具 UI 的消息 SHALL 立即反映状态变更，并在回放时保持一致。

#### Scenario: Submit updates previous bubble and replay remains consistent
Given 用户在 Learn 中看到上一轮包含 A2UI 工具 UI 的 assistant 消息
When 用户提交 tool-result
Then 该消息内的 A2UI 组件 SHALL 立即反映状态变化（例如锁定、显示选择）
And 刷新页面后历史回放 SHALL 保持一致的已提交状态

### Requirement: Tool UI rendering SHALL be scoped to the last step

当 assistant 消息包含多个 step 时，UI 渲染工具组件 SHALL 只作用于“最后一个 step”，避免旧 step 的工具 UI 污染新轮次渲染。

#### Scenario: Only last-step tool parts are rendered as UI
Given 一个 assistant 消息的 parts 中存在多个 step（通过 `step-start` 分隔）
When UI 渲染工具组件
Then 系统 SHALL 仅基于最后一个 `step-start` 之后的 tool parts 渲染工具 UI
And 不得渲染来自更早 step 的 tool parts 作为当前轮工具 UI

