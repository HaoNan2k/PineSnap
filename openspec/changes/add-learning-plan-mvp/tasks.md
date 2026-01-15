# Tasks: Learning Plan MVP（文本计划 + 右侧交互）

> 说明：本 tasks 覆盖从"提案 → 实现 → 手动回归"的可验证步骤。实现阶段完成后应将对应条目勾选为 - [x]。

## 提案阶段（spec）

- [ ] 创建 `openspec/changes/add-learning-plan-mvp/`（proposal/design/tasks + delta spec）
- [ ] `openspec validate add-learning-plan-mvp --strict` 通过

## 实现阶段（apply）

### 路由与会话

- [ ] 确定 `/learn/[resourceId]` 作为学习入口
- [ ] 使用 `resourceId`（内存态）贯穿澄清 → Plan → 互动（MVP）

### AI 接口（非流式）

- [ ] 实现 `POST /api/learn/clarify`：输出 3 条澄清问题文本
- [ ] 实现 `POST /api/learn/plan`：基于答案生成 Plan（Markdown）
- [ ] 实现 `POST /api/learn/chat`：Plan 之后的文本对话

### UI（右侧交互区）

- [ ] 右侧交互区展示 Markdown 文本
- [ ] 交互区提供输入框与提交
- [ ] 学习流程阶段切换（clarify → plan → interact）

### 数据与约束

- [ ] MVP 不落库，不新增 Prisma schema
- [ ] 不接入现有 Chat Sidebar/Conversation 模块

## 手动回归清单（@Browser）

- [ ] 进入 `/learn/[resourceId]` 能启动澄清阶段
- [ ] 完成澄清后能生成 Plan 文本
- [ ] Plan 后进入交互区并能进行文本对话
