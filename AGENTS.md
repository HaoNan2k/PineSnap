<!-- OPENSPEC:START -->
# OpenSpec 指南

这些说明用于本项目中的 AI 助手。

当需求满足以下任一条件时，必须先打开 `@/openspec/AGENTS.md`：
- 提到规划或提案（例如 proposal、spec、change、plan 等关键词）
- 引入新能力、破坏性变更、架构调整，或较大的性能/安全工作
- 需求含糊，需要先以权威规范为准再开始编码

使用 `@/openspec/AGENTS.md` 了解：
- 如何创建与应用变更提案
- 规范格式与约定
- 项目结构与指导

请保留此托管区块，以便 \`openspec update\` 能刷新指令文件。

<!-- OPENSPEC:END -->

# 项目知识库

**生成时间:** 2026-01-16 17:01:00 CST
**提交:** 1b49d00
**分支:** feat/plan-optimize

## 概述

PineSnap 是一个基于 Next.js 16 的 AI 聊天应用，采用规范驱动开发（OpenSpec）、tRPC 和 **Vercel AI SDK v6（beta）**。项目以「不止收藏」为核心理念——面向学习者提供 AI + A2UI 辅助交互体验，并使用结构化消息部件（ChatPart）存储对话内容。

## 目录结构

```
.
├── app/             # App Router 页面与 API 处理器（chat、learn、capture）
├── components/      # React 组件（聊天专用、共享 UI、侧边栏）
├── hooks/           # 自定义 React Hooks
├── lib/             # 核心逻辑：聊天转换、数据库访问、存储、认证
├── server/          # tRPC 后端路由与上下文
├── prisma/          # 数据库模式与迁移
├── openspec/        # 规范驱动开发文档与变更提案
├── docs/            # 项目文档（如 Bilibili 连接说明）
└── public/          # 静态资源
```

## 快速定位

| 任务 | 位置 | 说明 |
|------|------|------|
| 聊天逻辑 | `lib/chat/` | 转换器、类型定义、工具函数 |
| 数据库访问 | `lib/db/` | Conversation、Message、Resource 等数据访问层 |
| 流式 API | `app/api/chat/route.ts` | 懒创建会话与流式响应 |
| UI 组件 | `components/` | 聊天 UI 与共享基础组件 |
| tRPC 路由 | `server/routers/` | tRPC procedures 定义 |
| 数据库模式 | `prisma/schema.prisma` | Conversation、Message 等模型定义 |
| 自定义 Hooks | `hooks/` | `use-mobile`、`use-scroll-to-bottom` 等 |
| 请求中间件 | `middleware.ts` | Next.js 中间件（鉴权等） |
| 类型定义 | `lib/chat/types.ts` | ChatPart 等核心类型 |
| 开发调试工具 | `app/dev/trace/` | 追踪 AI 请求/响应的调试界面 |

## 约定（DO / DON'T）

### DO（必须遵守）

- **Prisma 7 导入**：使用自定义输出路径 `../generated/prisma/client`，导入时带 `/client`
- **OpenSpec 提案**：每个重大变更必须在 `openspec/changes/` 中先提交提案
- **软删除**：使用 `deletedAt` 时间戳标记删除；禁止物理删除
- **服务端为真相源**：历史消息拼接必须在服务端完成，客户端只发送 `conversationId` + 当前输入
- **严格 TypeScript**：所有代码必须类型安全

### DON'T（禁止）

- **禁止 `as any`**：不允许使用类型逃逸
- **禁止 `@prisma/client`**：只能使用本地生成的客户端（`generated/prisma/client`）
- **禁止客户端传历史**：不要从客户端向 API 发送完整对话历史

## 独特风格

- **北欧森林主题**：在 `globals.css` 中使用 Tailwind 4 自定义 CSS 变量
- **懒创建会话**：会话仅在首条消息发送后才由服务端创建

## 环境配置

参考 `env.example` 配置环境变量。主要包括：
- 数据库连接（PostgreSQL）
- Supabase 认证与存储
- AI 模型 API Key

## 常用命令

```bash
pnpm dev             # 启动开发服务器
pnpm build           # 构建（会运行 migrate + 生成 prisma）
pnpm lint            # 运行 eslint
openspec validate    # 校验 OpenSpec 变更
```

## 注意事项

- **AI SDK v6（beta）**：本项目使用 **Vercel AI SDK v6 beta**（`ai@6.0.0-beta.169`、`@ai-sdk/react@3.0.0-beta.172`）。遇到类型/行为疑问时，必须查阅本仓库 `node_modules/ai` 和 `node_modules/@ai-sdk/react` 中的实际类型定义，而非外部文档。beta 版本可能存在 breaking changes，任何涉及 `useChat`、流式响应、data stream 的用法必须先对照当前版本的类型/行为。
- **开发调试工具**：使用 `/dev/trace` 页面（仅开发环境）可以追踪和排查 AI 请求/响应问题。该工具会记录每次学习对话的完整上下文，包括请求消息、响应消息、输入 parts 等，支持按 `learningId` 和 `clientMessageId` 过滤查看。
- **签名 URL**：文件通过稳定 ID 引用，但展示时使用短期签名 URL（Supabase Storage）
- **长期维护文档（Capture 鉴权）**：`docs/capture-auth-data-model.md` 是扩展采集鉴权的数据模型真相文档。凡是修改 `CaptureAuthCode` / `CaptureToken` / `Resource` 关系、`/api/capture/extension/*`、`/api/capture/jobs` 契约或 token 生命周期逻辑，必须同步更新该文档。
