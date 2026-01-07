# Tasks: update-engineering-hygiene-docs-auth-spec

## 文档与规范

- [ ] 更新根 `README.md`：本地开发 / 部署 / 环境变量 / 常见报错排查
- [ ] 新增 `.env.example`：明确所有必需环境变量与示例值形态（HTTP vs Postgres）
- [ ] 更新 `openspec/project.md`：移除 SWR 旧描述，对齐 tRPC + React Query + DataStream invalidate
- [ ] 新增 `openspec/specs/auth/spec.md`：固化当前 auth 能力的真相规范
- [ ] 编写本次变更的 delta spec：`changes/.../specs/auth/spec.md`

## 代码清债（不改外部契约）

- [ ] `lib/trpc/react.tsx`：移除 `as any`，使用类型守卫判断 `UNAUTHORIZED`/`FORBIDDEN`
- [ ] `app/chat/page.tsx`：复用 `lib/env.ts` 的 `requireEnv`
- [ ] 删除未使用 `app/providers.tsx`
- [ ] 更新 `.gitignore`：允许提交 `.env.example`

## 验证

- [ ] `pnpm lint`
- [ ] `pnpm build`（不需要启动服务）
- [ ] `openspec validate --all --strict`

