## Tasks

1. [ ] 创建 Supabase 项目（手动）：
   - [x] `dev` project（新加坡）
   - [ ] `prod` project（新加坡，后续再做）
2. [ ] Supabase Auth 配置（手动）：
   - [x] `dev`：启用 Email OTP（验证码）
   - [x] `dev`：禁用 Email + Password（或至少不对外开放）
   - [ ] `prod`：按相同策略配置（后续再做）
   - [ ] `dev/prod`：配置 Site URL 与 Redirect URLs（当前先完成 dev，本地回调）
3. [ ] 环境变量梳理（当前先完成 dev；prod 后续再做）：
   - [x] `dev`：`SUPABASE_URL`
   - [x] `dev`：`SUPABASE_ANON_KEY`
   - [x] `dev`：`SUPABASE_SERVICE_ROLE_KEY`（仅服务端）
   - [x] `dev`：`DATABASE_URL`
   - [ ] `prod`：以上变量（后续再做）
4. [ ] 服务器端鉴权落地（实现阶段）：
   - [x] 聊天相关 API MUST 从 Supabase session 读取 `user.id` 作为 `userId`
   - [x] 未登录请求返回 401
   - [x] 已登录但访问他人会话返回 403
5. [ ] 删除 debug DB 导出接口：
   - [x] 删除 `GET /api/debug/db` 路由与所有引用
6. [x] 回归验证（手动）：
   - [x] 未登录访问聊天 API 返回 401
   - [x] 登录后只能看到自己的会话列表与消息
   - [x] 访问不存在会话返回 404；访问他人会话返回 403
   - [x] `/api/debug/db` 不存在（404）


