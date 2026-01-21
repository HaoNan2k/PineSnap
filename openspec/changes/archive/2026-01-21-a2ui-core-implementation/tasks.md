# Tasks: A2UI Core Implementation

## Phase 1: Foundation & Tooling (Backend)
- [x] 在 `app/api/learn/chat/route.ts` 中集成 A2UI Tools (Single, Multiple, Fill)
- [x] 配置 `streamText` 的 `maxSteps` 和 `onFinish` 持久化逻辑
- [x] 编写 Context Manager 基础逻辑：在 System Prompt 中注入 Learning Plan 全文
- [x] 建立 Memory 抽象模块接口 (`lib/chat/memory.ts`)

## Phase 2: UI Component Registry (Frontend)
- [x] 创建遵循 Nordic Forest 风格的基础交互组件：`SingleChoiceQuiz`
- [x] 创建遵循 Nordic Forest 风格的基础交互组件：`MultipleChoiceQuiz`
- [x] 创建遵循 Nordic Forest 风格的基础交互组件：`FillInBlank`
- [x] 实现 `A2UIRenderer` 分发器，支持多工具 (Parallel Tools) 并排渲染
- [x] 在消息渲染逻辑中集成 `A2UIRenderer`

## Phase 3: Interaction Loop & State Management
- [x] 实现“消息内局部状态”暂存机制，支持管理多个 Parallel Tools 的输入
- [x] 实现消息底部的“统一提交”按钮逻辑 (Submit All)
- [x] 对接 `useChat` 的工具结果回传逻辑 (Batch Submit Tool Results)
- [x] 实现组件的“归档/只读”模式

## Phase 4: Integration & Verification
- [x] 验证全链路：AI 发题 -> 用户作答 -> 统一提交 -> AI 针对性评价
- [x] 验证历史回放：刷新页面后，A2UI 组件能正确还原为“已提交”的只读状态
- [x] 修复可能存在的 Zod 校验或类型安全问题
