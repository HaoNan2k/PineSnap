# Design: Supabase Auth（Email OTP）作为聊天隔离真相源

## 概览

本设计将 Supabase Auth 引入为“用户身份真相源”，并把聊天系统里所有“会话/消息/文件”的隔离从临时 `default-user` 升级为 **Supabase `user.id`**。

同时，为避免调试污染与安全风险，要求 dev/prod 使用不同 Supabase Project，并删除 debug DB 导出 API。

## 关键决策

- **登录方式**：仅启用 Email OTP（验证码），邮箱即账号。
- **长期用户**：用户首次通过 OTP 登录后创建长期账户；后续登录复用同一 `user.id`。
- **隔离策略**：服务端从 Supabase session 获取 `user.id`，并以此作为所有 DB 读写的 `userId` 过滤条件；客户端不得传 `userId`。
- **环境分离**：dev/prod 两套 Supabase Project；本地开发连接 dev，线上 Vercel production 连接 prod。
- **安全**：完全删除 `GET /api/debug/db`。

## 接口与错误语义（概念）

- **未登录**：聊天相关 API MUST 返回 401。
- **已登录但无权限**：当资源存在但不属于当前用户时 MUST 返回 403（或等价的“不泄露存在性”策略；本项目现阶段选择 403 以便排障，后续可调整为 404）。
- **资源不存在**：返回 404。

> 注意：当前 `chat-conversation` 主 spec 已要求“若会话不存在或无权限，系统 MUST 返回对应错误状态（例如 404/403）”。本变更将把“无权限”与“未登录”进一步区分为 403/401。

## 环境变量（概念清单）

本变更将引入/使用下列环境变量（dev/prod 各自一套）：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（仅服务端使用，用于需要绕过 RLS 的管理/后台/系统任务；本变更阶段尽量避免在用户请求路径中使用）

现有变量（不变）：

- `DATABASE_URL`（指向 Supabase Postgres 连接串）
- `AI_GATEWAY_API_KEY`

## 数据模型映射（概念）

- `Conversation.userId`：存储 Supabase `user.id`（UUID 字符串），作为会话归属与隔离键。
- `Message`：通过 `conversationId` 归属会话；权限检查通过会话归属完成。

## Debug 能力替代方案（不新增危险 API）

在删除 `/api/debug/db` 后，开发调试建议依赖：

- Supabase Dashboard（dev project）查询与查看 Storage 对象
- Prisma Studio / SQL（dev DB）
- 应用日志（server logs）


