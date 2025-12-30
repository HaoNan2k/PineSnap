# Proposal: 工程治理 - 文档补齐与类型安全清债

## 背景与动机

项目已完成从本地到 Vercel 的上线，但在部署与维护过程中暴露出一些工程性问题：

- 环境变量契约缺少“单一权威说明”，导致 `SUPABASE_URL`（HTTP）与 `DIRECT_URL`（Postgres）容易误填而引发构建失败。
- 根 `README.md` 仍为默认模板，缺少本项目的启动、部署与排障说明。
- `openspec/project.md` 存在过期描述（SWR / `/api/conversations`），与当前 tRPC + React Query 实现不一致。
- 代码中存在少量类型安全欠账（`as any`）与重复实现（重复 `requireEnv`），降低长期可维护性。

## 目标

- 补齐工程文档：本地开发、环境变量、部署、常见报错与排障路径。
- 在 OpenSpec 中补齐并固化 **auth capability** 的真相规范（以当前实现为准）。
- 清理明显的工程欠账：去除 `as any`、移除未使用文件、统一环境变量读取工具。

## 非目标

- 不改变路由形态、不新增/修改 API 契约、不调整数据库 schema。
- 不引入新的业务能力或权限策略（仅对齐当前实现与文档）。

## 范围

### 文档

- 更新根 `README.md`（替换默认模板）
- 新增 `.env.example`（可提交，作为环境变量契约模板）
- 更新 `openspec/project.md` 以对齐当前实现（tRPC + React Query）
- 新增 `openspec/specs/auth/spec.md` 作为权威规范

### 代码治理

- `lib/trpc/react.tsx`：移除 `as any`，用类型守卫实现错误码判断
- `app/chat/page.tsx`：复用 `lib/env.ts` 的 `requireEnv`
- 删除未使用的 `app/providers.tsx`

## 成功标准

- ✅ 新同学仅凭 `README.md` + `.env.example` 可在本地启动并完成基础功能验证
- ✅ 环境变量角色清晰（HTTP vs Postgres，server-only vs public）
- ✅ `openspec validate --all --strict` 通过（本次变更相关文档符合格式约束）
- ✅ 代码库中不再出现新增的 `as any`；本次清理点位被移除

