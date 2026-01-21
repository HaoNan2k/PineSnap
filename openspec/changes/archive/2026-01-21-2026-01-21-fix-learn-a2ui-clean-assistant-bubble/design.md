## Overview
本设计通过 UI 层“门控（gating）+ 统一裁剪（pruning）”实现 Learn 新一轮 assistant 消息的**绝对干净**渲染：

- **Pruning（裁剪）**：工具 UI 只渲染“last step”的 tool parts，避免新消息继承上一轮工具 UI。
- **Gating（门控）**：对“正在流式生成中的最新 assistant 消息”，在检测到“本轮首个有效输出”前不渲染整条消息（或渲染 Loading placeholder），彻底消除闪动。

这两者均属于 UI 层 view-model 规则，不改变 DB 与模型消息构造。

---

## Terms
- **Snapshot assistant**：AI SDK v6 可能以“上一条 assistant 消息的 snapshot”作为新响应消息初始 state。
- **Step**：AI SDK 的流式 UI 协议中，`{ type: "step-start" }` 用于标记 step 边界（常见于 tool loop）。
- **Turn output（本轮有效输出）**：代表本轮响应已产生真实内容（例如 text/tool-call/其它可展示 part），从而允许展示新气泡。

---

## UI Rules

### Rule A: Tool UI Pruning (last step only)
只从 last step 渲染 tool invocations：
- 找到 message.parts 中最后一个 `step-start` 的索引
- tool 渲染仅考虑该索引之后的 tool parts

目的：即使新消息继承了上一条 assistant 的 tool parts，也不会被渲染为重复 UI。

### Rule B: Assistant Bubble Gating (no flicker)
对 Learn 消息列表中**最后一条、且处于 in-flight 状态**的 assistant 消息启用门控：

- 在 `hasTurnOutput(...)` 为 false 时：
  - **不渲染该 assistant 气泡**（绝对干净），或
  - 渲染一个中性的 Loading placeholder（推荐）。
- 当 `hasTurnOutput(...)` 变为 true 时：
  - 渲染该消息（文本/工具/其它 parts 按统一规则展示）。

#### Why this removes flicker
闪动发生在 `start(messageId)` 推入新消息、但首个 `text-delta`/tool delta 尚未到达的窗口期。门控保证在该窗口期新消息不可见，从而杜绝继承内容闪现。

---

## hasTurnOutput Definition
门控依赖 `hasTurnOutput` 的可解释定义（可封装为函数，便于后续迭代）：

默认实现建议（任一满足即可视为 true）：
- **Snapshot diff (recommended)**：获取上一条 assistant（或在新消息创建时捕获基线 snapshot），对 last-step parts 生成轻量 fingerprint/hash；当当前 fingerprint 与基线不同，即视为“本轮已有输出”。
- **Text output**：消息在 last step 范围内出现任何 `type: "text"` part（或累计文本长度 > 0）。
- **Tool output**：last step 范围内出现任何 `tool-*` part（工具调用/工具相关 UI part）。
- **Other visible parts**：last step 范围内出现任何可展示的 UI part（例如 `file` / `source-*` / data parts）。

注意：
- Snapshot diff 不需要额外网络请求：直接使用 `useChat` 的 messages 获取上一条 assistant。
- 历史回放消息（来自 DB 转换）通常没有 `step-start`，因此门控仅用于 in-flight 最新 assistant，不影响历史消息可见性。

---

## Error / Timeout UX (minimal)
门控期间若超时或请求失败：
- Loading placeholder 替换为明确错误态（例如“生成失败，点击重试”）。
- 错误态不应展示继承内容。

本变更只要求最小可用错误态，后续可增强（自动重试、错误原因展示等）。
## Overview
本设计通过 UI 层“门控（gating）+ 统一裁剪（pruning）”实现 Learn 新一轮 assistant 消息的**绝对干净**渲染：

- **Pruning（裁剪）**：工具 UI 只渲染“last step”的 tool parts，避免新消息继承上一轮工具 UI。
- **Gating（门控）**：对“正在流式生成中的最新 assistant 消息”，在检测到“本轮首个有效输出”前不渲染整条消息（或渲染 Loading placeholder），彻底消除闪动。

这两者均属于 UI 层 view-model 规则，不改变 DB 与模型消息构造。

---

## Terms
- **Snapshot assistant**：AI SDK v6 可能以“上一条 assistant 消息的 snapshot”作为新响应消息初始 state。
- **Step**：AI SDK 的流式 UI 协议中，`{ type: "step-start" }` 用于标记 step 边界（常见于 tool loop）。
- **Turn output（本轮有效输出）**：代表本轮响应已产生真实内容（例如 text/tool-call/其它可展示 part），从而允许展示新气泡。

---

## UI Rules

### Rule A: Tool UI Pruning (last step only)
只从 last step 渲染 tool invocations：
- 找到 message.parts 中最后一个 `step-start` 的索引
- tool 渲染仅考虑该索引之后的 tool parts

目的：即使新消息继承了上一条 assistant 的 tool parts，也不会被渲染为重复 UI。

### Rule B: Assistant Bubble Gating (no flicker)
对 Learn 消息列表中**最后一条、且处于 in-flight 状态**的 assistant 消息启用门控：

- 在 `hasTurnOutput(...)` 为 false 时：
  - **不渲染该 assistant 气泡**（绝对干净），或
  - 渲染一个中性的 Loading placeholder（推荐）。
- 当 `hasTurnOutput(...)` 变为 true 时：
  - 渲染该消息（文本/工具/其它 parts 按统一规则展示）。

#### Why this removes flicker
闪动发生在 `start(messageId)` 推入新消息、但首个 `text-delta`/tool delta 尚未到达的窗口期。门控保证在该窗口期新消息不可见，从而杜绝继承内容闪现。

---

## hasTurnOutput Definition
门控依赖 `hasTurnOutput` 的可解释定义（可封装为函数，便于后续迭代）：

默认实现建议（任一满足即可视为 true）：
- **Snapshot diff (recommended)**：获取上一条 assistant（或在新消息创建时捕获基线 snapshot），对 last-step parts 生成轻量 fingerprint/hash；当当前 fingerprint 与基线不同，即视为“本轮已有输出”。
- **Text output**：消息在 last step 范围内出现任何 `type: "text"` part（或累计文本长度 > 0）。
- **Tool output**：last step 范围内出现任何 `tool-*` part（工具调用/工具相关 UI part）。
- **Other visible parts**：last step 范围内出现任何可展示的 UI part（例如 `file` / `source-*` / data parts）。

注意：
- Snapshot diff 不需要额外网络请求：直接使用 `useChat` 的 messages 获取上一条 assistant。
- 历史回放消息（来自 DB 转换）通常没有 `step-start`，因此门控仅用于 in-flight 最新 assistant，不影响历史消息可见性。

---

## Error / Timeout UX (minimal)
门控期间若超时或请求失败：
- Loading placeholder 替换为明确错误态（例如“生成失败，点击重试”）。
- 错误态不应展示继承内容。

本变更只要求最小可用错误态，后续可增强（自动重试、错误原因展示等）。

