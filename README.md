# PineSnap

PineSnap 正在从“AI 聊天应用练习仓库”演进为面向学习者的学习产品。当前仍保留部分聊天相关实现，但产品方向与迭代重心以学习体验为主。

## 项目定位

- 目标：打造面向学习者的 AI + A2UI 学习产品
- 方法：采用 OpenSpec（规格驱动）方式演进，持续沉淀可验证的规范与实现
- 技术：Next.js App Router、**Vercel AI SDK v6（beta）**、Supabase Auth、Prisma + PostgreSQL、tRPC + React Query、文件上传/签名 URL

## 模块说明

- **Chat 模块**：计划弃用（未来将移除或替换），不作为当前主要能力方向

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

### 开发调试工具

在开发环境中，可以使用 `/dev/trace` 页面追踪和排查 AI 请求/响应问题：

- 查看每次学习对话的完整上下文（请求消息、响应消息、输入 parts）
- 支持按 `learningId` 和 `clientMessageId` 过滤查看
- 复制完整的调试信息用于问题排查

**注意**：该工具仅在开发环境（`NODE_ENV !== 'production'`）可用。

### 启动本地数据库（可选）

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

## B 站 Chrome 扩展采集（MVP）

当前默认采集路径为 Chrome 扩展（Manifest V3）：在 B 站视频页一键采集字幕并写入 PineSnap。

- 开发与联调说明：`docs/chrome-extension-bilibili-capture.md`

## 技术栈说明

### Vercel AI SDK v6（beta）

本项目使用 **Vercel AI SDK v6 beta**（`ai@6.0.0-beta.169`、`@ai-sdk/react@3.0.0-beta.172`）。

**重要提示**：
- 遇到类型/行为疑问时，**必须**查阅本仓库 `node_modules/ai` 和 `node_modules/@ai-sdk/react` 中的实际类型定义
- 不要依赖外部文档或示例，因为 v6 beta 的 API 可能与稳定版有差异
- 使用 `/dev/trace` 调试工具排查 AI SDK 相关问题

