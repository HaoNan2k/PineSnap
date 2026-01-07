# Delta Spec: update-engineering-hygiene-docs-auth-spec (auth)

## ADDED Requirements

### Requirement: Supabase URL env vars MUST be valid HTTPS URLs
系统 MUST 将 `SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_URL` 视为 Supabase 项目的 **HTTP(S) 项目地址**（例如 `https://<project-ref>.supabase.co`），并禁止将 Postgres 连接串误填到该变量中。

#### Scenario: 构建期 prerender 不应因 SUPABASE_URL 形态错误而失败
- **WHEN** Next.js 在构建阶段预渲染页面（例如 `/_not-found`）
- **THEN** `NEXT_PUBLIC_SUPABASE_URL` MUST 为有效的 `https://...` URL
- **AND** 若该变量缺失或形态错误，系统 MUST 以清晰错误信息失败（便于排障）

### Requirement: Prisma DIRECT_URL MUST include sslmode=require for Supabase Postgres
当使用 Supabase Postgres 作为数据库时，迁移连接串 `DIRECT_URL` MUST 包含 `sslmode=require` 以确保在云构建环境中稳定建立 TLS 连接。

#### Scenario: 云构建环境下 migrate deploy 可稳定连接数据库
- **WHEN** 在 Vercel 等云构建环境执行 `prisma migrate deploy`
- **THEN** `DIRECT_URL` SHOULD 包含 `?sslmode=require`

