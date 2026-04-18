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
- **AND** sidebar 内容 MUST **不变**（Light Anchor 决策——sidebar 永远是整段 chat 时间线，与 canvas 当前步无关）
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

### Requirement: Frontend graceful handling of empty assistant response
当 canvas streamText 罕见地返回不含任何 tool call 的 assistant message（`toolChoice: "required"` 通常防住，但模型偶有违反），UI SHALL 检测这种状态并显示明确错误提示与重试入口，**而非**渲染空白或骨架屏。

**说明**：服务端不做兜底 retry（详见 outside voice 的 trade-off 分析）。前端 fallback 提示是一个零工程成本的 80% 方案。

#### Scenario: 无 tool call 的 assistant message 显示重试提示
- **WHEN** canvas useChat 接收到一条 assistant message 且 `getToolInvocationsFromLastStep(message.parts).length === 0`
- **THEN** canvas MUST 显示一条提示卡片："AI 没能生成下一步，请刷新页面或重试"
- **AND** 提示卡片 MUST 含一个"重试"按钮，点击后重新提交上一条 user/tool message
