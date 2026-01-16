# Tasks: 实现 Learning 模块与澄清工具

## 1. 数据库与类型
- [ ] 1.1 修改 `prisma/schema.prisma`:
  - 新增 `Learning`, `LearningResource`, `LearningConversation`.
  - 更新 `Role.tool`.
- [ ] 1.2 为 `Learning` 增加 `clarify` 字段（JSONB），用于保存 questions/answers。
- [ ] 1.3 执行 `prisma migrate dev`.
- [ ] 1.4 更新 `lib/chat/converter.ts` (tool role support).

## 2. 页面重构
- [ ] 2.1 重命名路由: `app/(focus)/learn/[resourceId]` -> `[learningId]`.
- [ ] 2.2 重构 `page.tsx`:
  - 参数改为 `learningId`.
  - 数据获取改为 `getLearningWithResources`.
  - 实现 SSR 初始化 Conversation 逻辑.
- [ ] 2.3 改造列表页 `app/(main)/sources/page.tsx`:
  - 增加多选与 "Create Learning" Action.

## 3. API 实现 (Backend)
- [ ] 3.1 `POST /api/learn/clarify`: 通过单次 JSON 输出生成单选/多选问题，并由服务端补齐 id 后持久化到 `Learning.clarify.questions`.
- [ ] 3.2 `POST /api/learn/plan`: 接收 answers，校验后生成 Plan，写入 `Learning.plan` 与 `Learning.clarify.answers`.
- [ ] 3.3 `POST /api/learn/chat`: 仅在 Plan 生成后允许进入正常 Chat（system prompt 注入 plan + resources）。

## 4. 前端组件
- [ ] 4.1 Learn 页面流程分段：进入后自动 clarify -> 表单 -> plan -> chat。
- [ ] 4.2 Clarify 表单仅支持单选/多选，不展示“重新回答”按钮。
- [ ] 4.3 Plan 展示后初始化 `useChat`，聊天历史不包含 clarify 记录。
