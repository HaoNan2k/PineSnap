# 项目上下文

## 目的
本项目是一个基于 Next.js App Router 的 AI 聊天应用练习仓库，目标是以“规格驱动开发（OpenSpec）”方式逐步构建可演进的聊天系统：支持新对话与历史会话深链、流式响应展示、结构化消息存储（parts/jsonb）、以及侧边栏历史列表的实时刷新。

## 技术栈
- Next.js 16（App Router）
- React 19
- TypeScript
- Vercel AI SDK（beta，`ai` + `@ai-sdk/react`）
- Prisma + PostgreSQL
- Tailwind CSS + shadcn/ui（Sidebar/Sheet/Tooltip 等）
- SWR（侧边栏会话列表缓存与刷新）

## 项目约定

### 代码风格
- 以 TypeScript 类型安全为优先，不使用 `any`。
- 遵循 ESLint/Next.js 的最佳实践（例如 Next 项目中使用 `next/image` 替代 `<img>`）。
- 组件与模块尽量保持职责单一，避免“layout 常驻 + 多层同步”导致状态分裂。

### 架构模式
- **服务端为真相源**：会话历史拼接、落库、幂等处理与会话生命周期由服务端控制。
- **会话 URL**：新对话入口为 `/chat`，历史会话为 `/chat/c/[id]`。
- **会话创建**：懒创建；仅在首条消息发送后创建 DB 会话记录。
- **URL 同步**：首条发送后使用 History API 更新 URL，避免真实导航导致流式中断。
- **侧边栏数据流**：侧边栏通过 `/api/conversations` + SWR 获取，DataStream 事件触发 `mutate('/api/conversations')` 刷新。

### 测试策略
- 当前以手动回归路径为主（@Browser 验证清单写在 changes/tasks 中）。
- 后续如引入 E2E 测试，可优先覆盖：新对话首条发送、历史会话回放、sidebar 刷新与排序、删除/重命名会话。

### Git 工作流
- 变更触达路由/API/DB/权限/存储契约时，先走 OpenSpec 变更提案，再进入实现阶段。
- 小型 UI/bug 修复可直接实现，但仍需保证 `openspec validate --all --strict` 通过（如涉及 OpenSpec 文件改动）。

## 领域上下文
- **Conversation**：会话实体（用于历史列表与深链），主键为 UUID。
- **Message**：归属某个 Conversation 的消息记录，内容以结构化 `parts`（`ChatPart[]`）存储在 `jsonb` 中。
- **clientMessageId**：客户端生成的幂等键，用于避免网络重试导致重复写入。

## 重要约束
- OpenSpec 文档（`openspec/` 下所有 Markdown 文件，包含 `openspec/changes/archive/**`）**必须使用简体中文**撰写与维护。
- 在 `spec.md` 中，场景标题 MUST 使用 `#### Scenario:` 四级标题格式；需求标题 MUST 使用 `### Requirement:`。
- 在 delta 规范中，操作标题 MUST 使用以下固定格式：`## ADDED Requirements` / `## MODIFIED Requirements` / `## REMOVED Requirements` / `## RENAMED Requirements`（不要翻译这些标题）。
- 规范性措辞建议使用 `SHALL`/`MUST`（可嵌入中文句子中，例如“系统 SHALL ...”），以保持一致的规范表达。

## 外部依赖
- 大模型推理由 Vercel AI SDK 驱动（具体模型由服务端配置）。
- 数据库存储使用 PostgreSQL（通过 Prisma 访问）。
