## 背景 / 问题

当前聊天系统使用服务端控制的临时 `userId`（例如 `default-user`）进行数据隔离，且存在用于调试的数据库导出接口 `GET /api/debug/db`。在“公开线上环境”下：

- 临时 `userId` 无法提供真实用户隔离与会话归属。
- Debug 导出接口存在严重数据泄露风险。

本变更将引入 Supabase Auth，并采用 Email OTP 作为唯一登录方式（邮箱即账号），从而让会话/消息的隔离以真实用户身份为真相源。

## 目标

- 接入 Supabase Auth（Email OTP），建立长期用户（邮箱即账号）。
- 聊天相关读写 API MUST 基于 Supabase Auth 的 `user.id` 做隔离过滤（服务端为真相源）。
- 对未登录请求返回 401；对已登录但无权限资源返回 403；资源不存在返回 404（保持语义清晰）。
- **完全删除** `GET /api/debug/db`。
- 支持 dev/prod 两套环境（两套 Supabase Project），避免本地调试污染线上数据与策略。

## 非目标

- 不接入第三方 OAuth（Google/Apple 等）。
- 不实现 Email + Password（密码体系与找回流程暂不纳入）。
- 不引入“任务/摄取”模块与知识库（Document/Library）相关能力。
- 不实现“邮箱变更、账号绑定多个身份提供方”等高级账号管理（后续按需）。

## 范围

- 安全与鉴权：为聊天相关 API（会话/消息/文件上传）引入 Supabase Auth 校验与 userId 绑定。
- 数据隔离：`Conversation.userId` 语义升级为 Supabase `user.id`（UUID 字符串）。
- Debug API：删除 `app/api/debug/db/route.ts`。
- 环境管理：定义 dev/prod Supabase Project 的配置方式与必要环境变量。


