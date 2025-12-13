# Proposal: refactor-chat-components-structure

## Summary
将 `components/chat/model` 重构为更清晰的 `types/`、`hooks/`、`utils/` 目录结构，并统一项目内的 import 风格（优先 `@/` 别名）。本变更 **不修改** 聊天存储/持久化策略与数据内容，仅做代码组织与可读性整理。

## Motivation
- 当前 `model/` 同时承担 types、状态常量、hooks、以及工具函数职责，阅读成本偏高。
- 页面层与组件层存在相对路径与 `@/` 混用，降低一致性与可维护性。
- 小质量问题（例如 hover class 依赖 `group` 却未生效、`Button` className 组合逻辑混乱）影响代码观感。

## Non-Goals
- 不改变 localStorage 的 key/version/读写行为（“存储/持久化逻辑先别管”）。
- 不引入新能力、不改变 UI 交互/视觉规范。
- 不重构数据模型与消息持久化链路（后续再做）。

## Impacted Areas
- `components/chat/*`（目录与引用路径）
- `app/socraticu/page.tsx`（import 风格统一）
- `components/ui/button.tsx`、`components/chat/components/MessageRow.tsx`（小整理）


