# Spec: A2UI Interaction Scenarios (Delta)

## ADDED Requirements

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
Then UI SHALL 展示多个组件并提供统一的“提交答案”入口
When 用户完成所有作答并点击提交
Then 所有组件 SHALL 同时锁定
And AI SHALL 对综合表现进行点评

### Requirement: A2UI renderer MUST fail gracefully for unknown tools

当 UI 无法找到与 toolName 对应的组件时，系统 MUST NOT 崩溃，并应回退到可理解的文本提示，指导用户用文本作答。

#### Scenario: Unknown tool name renders fallback text
Given AI 输出了一个未知的 toolName
When 渲染层查找不到对应组件
Then UI SHALL 显示提示文本说明该交互组件暂不支持
