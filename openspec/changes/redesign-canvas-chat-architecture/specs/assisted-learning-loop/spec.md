## ADDED Requirements

### Requirement: Canvas supports navigation to previous and next steps
UI SHALL 允许用户在 canvas 上左右翻页查看历史 step。每个历史 step 显示当时呈现的 tool（quiz / Socratic / 内容页等）以及用户当时的答案。

#### Scenario: 显示左侧 previous 按钮
- **WHEN** 用户停留在 canvas 任意 step（除第 1 步以外）
- **THEN** canvas 区域左侧 MUST 显示一个 `<` 按钮
- **AND** 该按钮 MUST 不挤压当前 step 的内容（绝对定位或边缘定位）

#### Scenario: 显示右侧 next 按钮
- **WHEN** 用户停留在历史 step（不是最新 step）
- **THEN** canvas 区域右侧 MUST 显示一个 `>` 按钮
- **WHEN** 用户停留在最新 step
- **THEN** `>` 按钮 MUST 不显示

#### Scenario: 点击 previous 翻到上一步
- **WHEN** 用户点击 `<` 按钮
- **THEN** canvas MUST 滑动到上一个 step
- **AND** sidebar 的 discussion 列表 MUST 同步切换为该 step 锚定的内容
- **AND** progress bar 同步更新当前位置

### Requirement: Historical canvas steps are read-only
UI SHALL 在用户翻看历史 step 时，将该 step 的 tool widget 渲染为只读态：用户原答案显示但不可改，不显示 Continue 按钮。

#### Scenario: 历史 step 显示用户原答案
- **WHEN** 用户翻到历史 step
- **THEN** 该 step 的 quiz / Socratic 选项 MUST 显示用户当时选择的选项为高亮态
- **AND** 选项 MUST 不可点击（disabled 或 read-only state）

#### Scenario: 历史 step 隐藏 Continue
- **WHEN** 用户停留在历史 step
- **THEN** Continue 按钮 MUST 不显示或不可点击
- **AND** 系统 MUST NOT 允许任何修改既有 message 的操作

### Requirement: Server-side fallback for canvas tool-only enforcement
系统 SHALL 在 `/api/learn/chat` 的 streamText `onFinish` 中检测响应是否包含至少一个 tool call。若 response 不含任何 tool call，MUST 触发一次性 retry（重新发送相同输入），retry 仍失败则 fallback 写入一条 `presentContent` 错误消息（"系统暂时无法生成下一步，请稍后再试"）。

#### Scenario: 无 tool call 触发 retry
- **WHEN** streamText onFinish 触发，且 response.messages 中无任何 tool call
- **THEN** 系统 MUST 重新调用一次 streamText（保持原 input）
- **AND** retry 的结果 MUST 应用同样的检测逻辑

#### Scenario: retry 失败后 fallback
- **WHEN** retry 仍未产生 tool call
- **THEN** 系统 MUST 在 canvas conversation 写入一条 assistant message，含一个 `presentContent` tool call，content 为预定义的错误提示
- **AND** 系统 MUST 记录 error 日志

### Requirement: Stream abort handling
系统 SHALL 在 `/api/learn/chat` 的 `toUIMessageStreamResponse` 配置 `consumeSseStream: consumeStream`，确保 stream abort 时 onFinish 仍触发并通过 `isAborted: true` 区分。Abort 路径下系统 MUST NOT 写入任何 message 到 canvas conversation，且 MUST 回滚本轮已写入的 user/tool message。

#### Scenario: abort 时不写入 message
- **WHEN** stream 被 abort（client disconnect / network error）
- **AND** onFinish 触发且 isAborted 为 true
- **THEN** 系统 MUST NOT 调用任何 createMessage
- **AND** 系统 MUST 软删除本轮已写入的 user/tool message（设 deletedAt）

#### Scenario: 前端展示 abort 提示
- **WHEN** 客户端收到 abort response
- **THEN** UI MUST 显示提示（例如 "网络中断，请重试"）
- **AND** UI MUST 允许用户重新提交相同的答案

## MODIFIED Requirements

### Requirement: Learning chat enforces tool-only output
系统 SHALL 在学习模式下使用 `streamText({ toolChoice: "required" })` 强制模型每轮至少调用一个 tool。**新增**：服务端兜底检测无 tool call 的响应（参见上方 ADDED Requirement: Server-side fallback for canvas tool-only enforcement）。

**修改说明**：原由 `canvas-tool-redesign` 引入的 tool-only 强制保留；本 change 增加服务端兜底以应对 SDK 强制偶尔失效的情况。

#### Scenario: streamText 配置 toolChoice required
- **WHEN** 服务端处理学习模式的 chat 请求（plan 已存在）
- **THEN** streamText 调用 MUST 包含 `toolChoice: "required"`

#### Scenario: 澄清模式不受影响
- **WHEN** 服务端处理澄清模式（无 plan）
- **THEN** streamText 调用 MUST 使用 `toolChoice: "auto"`

#### Scenario: 兜底逻辑触发
- **WHEN** streamText onFinish 触发但无 tool call
- **THEN** 系统 MUST 触发 retry → fallback presentContent 流程
