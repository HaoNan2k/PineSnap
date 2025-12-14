# chat-ui (delta)

## MODIFIED Requirements

### Requirement: Core states styling consistency
UI SHALL 以消息数量与生成状态为依据渲染空态/加载态，并避免在异步流程（例如懒创建、URL 更新、流式生成）中出现“状态回退”。

#### Scenario: 空态
- **WHEN** 消息数量为 0
- **THEN** MUST 显示克制的空态（排版与留白）
- **AND** **WHEN** 已发送过用户消息但 assistant 仍在生成
- **THEN** UI MUST NOT 回到空态（必须持续展示已发送的用户消息，并展示生成中状态）

## ADDED Requirements

### Requirement: Message list must be driven by chat state
UI SHALL 以 chat 状态（例如 `useChat().messages`）作为消息列表的渲染真相源，并确保用户发送后立即可见、assistant 流式输出可见。

#### Scenario: 发送后立即可见
- **WHEN** 用户提交一条新消息
- **THEN** UI MUST 立即渲染该条用户消息（不等待网络请求完成）
- **AND** 当 assistant 开始流式返回时，UI MUST 持续渲染 assistant 的增量内容
