## ADDED Requirements

### Requirement: Server MUST resolve admin role from Supabase app_metadata
系统 MUST 通过 Supabase 用户对象的 `app_metadata.role` 字段确定用户是否具备 admin 权限。该字段 MUST NOT 由客户端可写途径修改，只能通过服务端 admin API 或直接 SQL 写入。

#### Scenario: Admin user app_metadata is read into context
- **WHEN** 服务端创建 tRPC context（`server/context.ts`）解析当前用户
- **THEN** context 的 `user` 对象 MUST 暴露 `role` 字段，值来自 `supabase.auth.getUser()` 返回的 `user.app_metadata?.role`
- **AND** 默认值 MUST 为 `"user"`（即 `app_metadata.role` 缺失时视为普通用户）

#### Scenario: Client cannot escalate role
- **WHEN** 客户端尝试通过任何前端可见的途径（cookie / localStorage / request header）声明自己是 admin
- **THEN** 系统 MUST NOT 信任该声明，role 来源 MUST 仅为服务端从 Supabase JWT 解出的 `app_metadata.role`

### Requirement: System MUST provide adminProcedure for tRPC admin-only routes
tRPC layer MUST 提供 `adminProcedure`，扩展现有 `protectedProcedure` 并强制 `ctx.user.role === "admin"` 才放行。

#### Scenario: Admin user calls adminProcedure
- **WHEN** `app_metadata.role === "admin"` 的用户调用任意 `adminProcedure`
- **THEN** procedure MUST 正常执行

#### Scenario: Authenticated non-admin calls adminProcedure
- **WHEN** 已登录但非 admin 用户调用 `adminProcedure`
- **THEN** tRPC MUST 抛 `FORBIDDEN` 错误（HTTP 403）
- **AND** procedure body MUST NOT 执行

#### Scenario: Unauthenticated user calls adminProcedure
- **WHEN** 未登录用户调用 `adminProcedure`
- **THEN** tRPC MUST 抛 `UNAUTHORIZED` 错误（HTTP 401，由底层 `protectedProcedure` 提供）
