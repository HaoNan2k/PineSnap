## Summary
Learn 模块在 A2UI 工具交互（tool-call/tool-result）后触发下一轮 AI 回复时，前端会短暂渲染上一轮的工具 UI（闪动/污染新气泡）。本变更引入“新 assistant 气泡就绪门控（gating）”的 UI 层策略：**新一轮消息在出现本轮首个有效输出前不渲染**，从而保证新气泡“绝对干净”且不会显示上一轮内容。

## Why
当前 AI SDK v6 的 `useChat` 在新响应开始时可能以“上一条 assistant 的 snapshot”作为新消息初始状态，导致新气泡短暂继承上一轮 `tool-*` parts，从而产生体验异常（重复 UI / 闪动）。

Learn 作为学习交互场景，对“题目消息（上一轮）”与“点评/下一题消息（新一轮）”的边界要求更严格：
- 用户提交后，上一轮题目 UI 必须立即锁定并保持一致（含回放）。
- 新一轮 AI 回复必须是独立、干净的消息气泡，不得显示上一轮 UI/文本残留。

## What Changes
- 在 Learn 前端实现“in-flight assistant gating（整条消息级别）”：对最新的、正在生成中的 assistant 消息，在检测到“本轮首个有效输出”前不渲染真实内容（显示 Loading placeholder）。
- 实现基于 snapshot diff 的 `hasTurnOutput` 判定：通过比较当前 parts 与上一条 assistant（或基线 snapshot）的 fingerprint，准确识别“本轮真实输出”vs“继承的旧内容”。
- 保持现有 last-step 工具裁剪：A2UIRenderer 与 tool-result resubmit 的 invocations 继续使用 last-step 裁剪（避免稳定态渲染旧工具 UI）。

## Goals
- **无闪动**：用户提交 tool-result 后，新的 assistant 气泡在任何时刻都不得渲染上一轮的 UI（包括 tool UI 与继承文本）。
- **分层清晰**：该策略是 UI 层 view-model 规则，不改变 DB 存储与 DB→Model 拼接逻辑。
- **可扩展**：后续新增 UI parts（sources/cards/file/data parts）可复用同一门控规则。
- **无额外网络请求**：门控逻辑使用现有 `useChat` 状态中的 messages（已包含上一条 assistant）进行判定。

## Non-Goals
- 不改变 Learn API 的请求/响应协议（不新增路由/不变更 payload shape）。
- 不要求 AI “必须输出文本”；失败/超时策略只提供最小明确错误态，后续可迭代优化。

## Scope
仅作用于 Learn 的聊天 UI（`components/learn/learn-focus.tsx` 及其依赖的 A2UI 渲染），不影响通用 Chat。

