# auth Specification

## Purpose
本规范定义本项目的认证与会话管理真相约束，覆盖 Supabase Auth 的集成方式、客户端与服务端的职责边界、以及环境变量契约（特别是 Supabase 项目 URL 与 Postgres 连接串的区别）。

## Requirements

### Requirement: Server MUST be the source of truth for authentication
系统 MUST 以服务端为真相源确定当前用户身份；客户端不得伪造/注入 `userId` 参与鉴权或数据隔离。

#### Scenario: Server resolves the authenticated user from session cookies
- **WHEN** 服务端处理页面渲染、Route Handler 或 tRPC 请求
- **THEN** 服务端 MUST 从请求 Cookie/会话中解析用户身份（例如 `supabase.auth.getUser()`）
- **AND** 所有数据访问 MUST 基于该用户身份执行隔离过滤

### Requirement: Supabase URL env vars MUST be valid HTTPS URLs
系统 MUST 将 `SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_URL` 视为 Supabase 项目的 HTTP(S) 项目地址（例如 `https://<project-ref>.supabase.co`）。

#### Scenario: Client-side Supabase initialization uses NEXT_PUBLIC env vars
- **WHEN** 客户端初始化 Supabase Browser Client
- **THEN** 系统 MUST 使用 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **AND** `NEXT_PUBLIC_SUPABASE_URL` MUST 为有效的 `https://...` URL

#### Scenario: Server-side Supabase initialization uses server-only env vars
- **WHEN** 服务端初始化 Supabase Server Client（SSR / middleware / admin client）
- **THEN** 系统 MUST 使用 `SUPABASE_URL` 与 `SUPABASE_ANON_KEY`
- **AND** `SUPABASE_SERVICE_ROLE_KEY` MUST 仅用于服务端的 admin client，且 MUST NOT 暴露到客户端

### Requirement: Postgres connection strings MUST NOT be used as Supabase project URLs
系统 MUST NOT 将 `postgresql://...` 形式的连接串用于 Supabase 的 `supabaseUrl` 参数。

#### Scenario: Build-time prerender does not fail due to invalid supabaseUrl
- **WHEN** Next.js 在构建阶段预渲染页面
- **THEN** `NEXT_PUBLIC_SUPABASE_URL` MUST NOT 为 `postgresql://...` 连接串
- **AND** 若配置错误，系统 SHOULD 输出清晰错误信息以便快速定位

### Requirement: Email OTP login behavior MUST be explicitly documented and is controlled by Supabase settings
系统 MAY 允许“登录即注册”（`shouldCreateUser=true`），但系统 MUST 明确：用户收到 “Confirm your signup” 或 “OTP code” 邮件的表现受 Supabase 的 Email Confirmations 设置与 URL Configuration 控制。

#### Scenario: Confirm email redirect MUST point to the correct site URL
- **WHEN** 用户点击 Supabase 发出的确认链接
- **THEN** 重定向目标 MUST 与 Supabase 的 Site URL / Redirect URLs 配置一致
- **AND** 线上环境 MUST NOT 跳转到 `http://localhost:3000`

