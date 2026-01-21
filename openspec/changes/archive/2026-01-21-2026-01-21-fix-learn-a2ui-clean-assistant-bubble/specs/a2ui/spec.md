## MODIFIED Requirements

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

