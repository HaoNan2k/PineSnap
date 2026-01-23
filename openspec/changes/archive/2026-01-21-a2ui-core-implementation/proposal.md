# Proposal: A2UI Core Implementation (Agent-to-UI)

## 1. 摘要 (Summary)
本提案旨在为 PineSnap 引入 **A2UI (Agent-to-UI)** 交互范式，将传统的“纯文本对话”升级为“交互式、响应式”的学习环境。通过引入 **Agent Core** 决策中枢和 **A2UI Registry** 交互教具箱，AI 能够主动决定何时展示 UI 组件（如 Quiz、填空）以引导用户学习。

**核心特色**：
*   **Parallel Tools**: 支持 AI 一次性下发多个组件，提供结构化的“测试题组”。
*   **Nordic Forest Style**: 交互组件深度集成项目的北欧森林视觉规范，确保学习体验的沉浸感与一致性。

## 2. 背景与动机 (Context & Motivation)
PineSnap 的核心理念是“导师制学习”。目前系统虽然能生成学习计划，但交互仍停留在文字层面。
*   **痛点**：用户只能通过打字回复，认知负担重；AI 无法精准掌握用户的理解程度。
*   **价值**：通过 Generative UI 提供的结构化交互，降低作答门槛，同时为系统提供高质量的认知反馈数据。

## 3. 目标 (Goals)
*   实现基于 Vercel AI SDK v6 的 **Agent Core**，支持多步推理 (Multi-step Tool Calls) 与 **Parallel Tool Calls**。
*   建立 **A2UI Registry** 映射系统，支持单选、多选、填空三类核心组件，并遵循 **Nordic Forest** 视觉规范。
*   支持 **混排式 UI 渲染**，使文字与组件交织在对话流中。
*   实现 **批量提交 (Batch Submit)** 交互模式，用户可一次性完成多个 Parallel Tools 的输入并提交。
*   建立 **Memory (抽象层)**，为后续持久化用户技能状态预留接口。

## 4. 非目标 (Non-Goals)
*   **代码编辑器**：本轮不实现复杂的代码运行环境。
*   **个性化记忆引擎**：本轮仅建立 Memory 抽象模块，不实现复杂的记忆蒸馏算法。
*   **边流边存**：A2UI 交互结果采用“最终落库”策略，不要求实时流式保存。

## 5. 关键决策 (Key Decisions)
*   **AI 评价方案 (方案 B)**：组件本身不含答案逻辑，由 AI 根据用户回传的 `tool-result` 进行语义化评价。
*   **并行工具执行 (Parallel Tools)**：允许 AI 在单次输出中调用多个 A2UI 工具，前端合并渲染。
*   **多步调用 (maxSteps > 1)**：开启 SDK 的多步功能，允许 AI 在收到 A2UI 结果后自动接话。
*   **归档模式**：一旦提交，该消息内的 A2UI 组件转为只读状态。
