# Proposal: 引入 Learning 模块与澄清工具

## 背景
当前 `learn/clarify` 功能是一个简单的 request/response API。为了支撑 **Multi-Resource Learning** (多素材聚合学习) 和 **Artifact-Centric** 架构，我们需要引入 `Learning` 实体作为核心。

本提案旨在实现：
1.  **多素材聚合**：用户可选择多个 Resource 创建一个 Learning Session。
2.  **澄清闭环（独立阶段）**：进入学习页后先进行澄清问答，用于生成 Plan，但澄清内容不进入聊天记录。
3.  **Artifact 生成**：最终生成并存储一份结构化的学习计划（Learning Artifact）。

## 目标
1.  **领域模型升级**：
    - 新增 `Learning` 实体，支持关联多个 `Resource` (多对多)。
    - `Learning` 存储生成的 Plan (Markdown)。
2.  **路由统一**：废弃 `/learn/[resourceId]`，统一使用 `/learn/[learningId]`。
3.  **交互闭环**：实现从“创建学习 -> 澄清问答 -> 生成 Plan -> 正常 Chat”的完整流。

## 范围
- **DB**:
  - `Learning` 表, `LearningResource` 中间表, `LearningConversation` 中间表。
  - `Role.tool` 枚举。
- **Page**: 重构 `app/(focus)/learn/[resourceId]` 为 `app/(focus)/learn/[learningId]`。
- **API**: 明确 `api/learn/clarify` 与 `api/learn/plan`，澄清与计划生成独立于 Chat。
- **UI**: Learn 页面分阶段展示（澄清表单 -> 计划 -> 聊天）。

## 非目标
- 暂不改造主聊天 (`/chat`)。
- 暂不引入“重新回答”按钮与多轮澄清。
- 暂不实现 Plan 的复杂状态流转 (Status)。
