# Design: A2UI Core Implementation

## 1. 架构概览 (Architecture Overview)

采用四层解耦架构：
1.  **Agent Core**: 基于 `openai/gpt-5.2`，配置 `maxSteps: 5`。
2.  **Context Manager**: 拼装 `System Prompt` (Plan + Memory Context) 和 `History`。
3.  **Memory (Abstract)**: 提供 `getUserKnowledge()` 和 `saveActivity()` 接口。
4.  **A2UI Registry**: 定义 Tool Schema 与 React 组件的映射。

## 2. API 契约 (API Contract)

### 2.1 Tool Definitions (`app/api/learn/chat/route.ts`)

AI 可调用的 A2UI 工具集：

*   **`renderQuizSingle`**:
    *   Input: `{ question: string, options: string[] }`
    *   Result: `{ selection: string, metadata: any }`
*   **`renderQuizMultiple`**:
    *   Input: `{ question: string, options: string[] }`
    *   Result: `{ selections: string[] }`
*   **`renderFillInBlank`**:
    *   Input: `{ question: string, placeholder: string }`
    *   Result: `{ answer: string }`

### 2.2 请求/响应数据流 (Parallel Tools 交互)

1.  **AI 输出**：在单次响应中返回多个 `tool-call` 类型的 `ChatPart`。
2.  **前端展示**：`A2UIRenderer` 检测到同组消息中的多个工具调用，采用卡片流或网格形式排布。
3.  **用户作答**：前端暂存各组件的 `InteractionState`（位于组件局部或父级 Message Context）。
4.  **批量提交**：
    *   用户点击消息底部的“确认提交 (Submit All)”。
    *   客户端遍历当前消息中所有 PENDING 的 `tool-call`，调用 `addToolResult`（或通过 `append` 回传消息流）。
    *   服务端接收到一组 `tool-result`，触发 AI 的下一步（评价与总结）。

## 3. 视觉规范 (Visual Style & UX)

A2UI 组件必须严格遵循 **Nordic Forest** 视觉规范（参考 `globals.css`）：

*   **色调 (Palette)**:
    *   **背景**: 使用 `var(--background)`，卡片背景使用 `var(--card)` 配合微弱的 `var(--border)`。
    *   **主色**: 按钮与高亮状态使用 `var(--forest)` (#2D4F38)。
    *   **辅助**: 选定状态可使用 `var(--sand)` (#D4C5A9) 作为点缀或边框。
    *   **反馈**: 正确/成功提示使用 `var(--success)` (#3E6B4D)。
*   **圆角 & 阴影**:
    *   统一使用 `var(--radius)` (0.5rem)。
    *   交互组件应具备轻微的悬停位移感，体现“教具”的物理实体感。
*   **排版**:
    *   标题使用 `var(--font-sans)` 配合 `font-semibold`。
    *   正文使用 `text-text-secondary`。

## 4. 数据模型 (Data Model)

沿用现有的 `ChatPart` 存储结构。

*   **ChatToolCallPart**:
    ```json
    {
      "type": "tool-call",
      "toolCallId": "call_123",
      "toolName": "renderQuizSingle",
      "input": { "question": "...", "options": [...] }
    }
    ```
*   **ChatToolResultPart**:
    ```json
    {
      "type": "tool-result",
      "toolCallId": "call_123",
      "toolName": "renderQuizSingle",
      "output": { "selection": "A" }
    }
    ```

## 4. 前端组件映射系统

建立一个 `ComponentRegistry` 模式：

```tsx
const A2UI_COMPONENTS = {
  'renderQuizSingle': SingleChoiceQuiz,
  'renderQuizMultiple': MultipleChoiceQuiz,
  'renderFillInBlank': FillInBlank,
};
```

## 5. 状态机 (State Machine)

1.  **ACTIVE**: AI 生成，用户可操作。
2.  **PENDING_SUBMIT**: 用户已选择，但尚未点击“统一提交”。
3.  **SUBMITTED**: 已回传给服务器，组件变为 Read-only。
4.  **ARCHIVED**: 对话已滚动或已结束，组件显示最终历史状态。

## 6. 关键权衡 (Trade-offs)

*   **批量提交 vs 单个提交**：选择批量提交是为了保持对话的“块”感，避免 AI 在用户答题过程中频繁打断思考。
*   **抽象 Memory**：虽然目前只在内存或简单数据库中操作，但统一接口后，未来迁移到 `Mem0` 或向量库不需要修改业务组件。
