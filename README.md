# PineSnap

基于 Next.js App Router 的 AI 聊天应用练习仓库，采用 OpenSpec（规格驱动）方式演进，集成 Supabase Auth、Prisma + PostgreSQL、tRPC + React Query，以及文件上传/签名 URL。

## 本地开发

### 前置条件

- Node.js（建议 LTS）
- pnpm（本项目以 pnpm 为准）
- 数据库（二选一）
  - **本地 Postgres**：使用 `docker-compose.yml`
  - **Supabase Postgres**：使用 Supabase 提供的连接串

### 环境变量

本仓库提供 `env.example` 作为模板（可提交文件）。复制并创建你自己的 `.env.local`：

```bash
cp env.example .env.local
```

关键约定（避免常见坑）：

- **Supabase 项目 URL（HTTP）**
  - `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` MUST 是 `https://...supabase.co`
  - 不能填 `postgresql://...` 连接串，否则会触发构建期 prerender 错误（`Invalid supabaseUrl`）
- **数据库连接串（Postgres）**
  - `DATABASE_URL` / `DIRECT_URL` MUST 是 `postgresql://...`
  - 使用 Supabase Postgres 时建议在 `DIRECT_URL`/`DATABASE_URL` 添加 `?sslmode=require`（云构建环境更稳）
- **敏感变量**
  - `SUPABASE_SERVICE_ROLE_KEY` 仅服务端使用，严禁放到 `NEXT_PUBLIC_*`

### 安装依赖与启动

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000`。

### 本地数据库（可选）

```bash
docker compose up -d
```

## 部署到 Vercel

### Build Command

建议由 `package.json` 管理构建逻辑（而不是写死在 Vercel UI）：

- `pnpm run build` 会执行：
  - `prisma migrate deploy`
  - `prisma generate`
  - `next build`

### Prisma / Supabase 常见问题

- **P1001: Can't reach database server**
  - 若使用 Supabase Postgres，建议 `DIRECT_URL`（migrate）包含 `sslmode=require`。
- **Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL**
  - 检查 `NEXT_PUBLIC_SUPABASE_URL` 是否误填成 `postgresql://...`。

### Supabase Auth（Email OTP / Confirm Signup）

如果你期望“输入邮箱 → 收 6 位码 → 登录”，但收到的是 “Confirm your signup”：

- 代码中使用了 `shouldCreateUser: true`，首次登录可能会创建用户
- 邮件类型取决于 Supabase 的 **Email Confirmations** 设置与邮件模板配置

确认链接跳转到 `localhost:3000` 的解决方式：

- Supabase Dashboard → Authentication → URL Configuration
  - 设置 **Site URL** 为你的线上域名
  - 配置 **Redirect URLs** 包含线上域名与本地开发域名

## OpenSpec（规格驱动）

OpenSpec 文档位于 `openspec/`。当变更触达路由/API/DB/权限/存储契约等“外部行为”时，请先走提案与验证流程：

```bash
openspec validate --all --strict
```

