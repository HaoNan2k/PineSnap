# auth Capability Delta Spec

## ADDED Requirements

### Requirement: Middleware 统一认证网关
系统 SHALL 使用 Next.js Middleware 在请求到达页面或 API 前统一拦截并验证认证状态。

#### Scenario: 保护历史会话路由
- **WHEN** 未认证用户访问 `/chat/c/[id]`
- **THEN** Middleware MUST 将请求重定向到 `/chat?unauthorized=true`
- **AND** 页面组件 MUST NOT 执行（不渲染）

#### Scenario: 保护 API 路由
- **WHEN** 未认证用户访问 `/api/trpc/conversation.*` 或 `/api/trpc/message.*`
- **THEN** Middleware MUST 返回 401 状态码
- **AND** MUST NOT 将请求传递到 tRPC handler

#### Scenario: 公开路由放行
- **WHEN** 未认证用户访问 `/chat`（新对话入口）
- **THEN** Middleware MUST 放行请求
- **AND** 页面 MUST 渲染登录表单

### Requirement: Auth Context 全局状态管理
系统 SHALL 提供客户端 Auth Context 以管理全局认证状态，并响应 Supabase 认证事件。

#### Scenario: 初始化时获取用户信息
- **WHEN** Auth Provider 挂载
- **THEN** 系统 MUST 调用 `supabase.auth.getUser()` 获取当前用户
- **AND** MUST 设置 `isLoading = false`
- **AND** MUST 提供 `user` 和 `isLoading` 状态供子组件使用

#### Scenario: 监听认证状态变化
- **WHEN** Auth Provider 挂载
- **THEN** 系统 MUST 订阅 `supabase.auth.onAuthStateChange`
- **AND** WHEN 收到 `SIGNED_IN` 事件
  - **THEN** MUST 更新 `user` 状态
  - **AND** MUST 跳转到 `/chat`
- **AND** WHEN 收到 `SIGNED_OUT` 事件
  - **THEN** MUST 清空 `user` 状态
  - **AND** MUST 清空 React Query 缓存

#### Scenario: Token 自动刷新
- **WHEN** Auth Provider 监听到 `TOKEN_REFRESHED` 事件
- **THEN** 系统 MUST 更新本地 `user` 状态
- **AND** MUST NOT 打断用户当前操作

### Requirement: 多标签页状态同步
系统 SHALL 使用 BroadcastChannel API 同步多个标签页的认证状态。

#### Scenario: 标签页 A 登录后同步到标签页 B
- **WHEN** 用户在标签页 A 完成登录
- **THEN** 标签页 A MUST 通过 BroadcastChannel 广播 `SIGNED_IN` 事件
- **AND** 标签页 B MUST 接收到该事件并更新 `user` 状态
- **AND** 标签页 B MUST 自动刷新数据（如侧边栏会话列表）

#### Scenario: 标签页 A 登出后同步到标签页 B
- **WHEN** 用户在标签页 A 点击退出登录
- **THEN** 标签页 A MUST 通过 BroadcastChannel 广播 `SIGNED_OUT` 事件
- **AND** 标签页 B MUST 接收到该事件并清空 `user` 状态
- **AND** 标签页 B MUST 清空 React Query 缓存

### Requirement: Session Cookie 持久化
系统 SHALL 正确实现 Supabase Session Cookie 的读写，确保用户刷新页面后仍保持登录状态。

#### Scenario: Session 写入 Cookie
- **WHEN** 用户输入 6 位 OTP 并调用 `supabase.auth.verifyOtp()`
- **THEN** Supabase Client MUST 自动处理 Session 写入
- **AND** 系统 MUST 确保 Cookie 包含正确的 `httpOnly`、`secure` 等选项
- **AND** MUST NOT 使用空函数 `setAll() {}` 导致写入失败

#### Scenario: 刷新页面后恢复 Session
- **WHEN** 用户刷新页面或重新打开浏览器
- **THEN** 系统 MUST 从 Cookie 读取 Session
- **AND** `supabase.auth.getUser()` MUST 返回有效的 `user` 对象
- **AND** 用户 MUST NOT 需要重新登录

### Requirement: 登出流程完整性
系统 SHALL 在用户登出时清理所有认证相关状态和缓存。

#### Scenario: 用户点击退出登录
- **WHEN** 用户点击右上角用户菜单中的"退出登录"
- **THEN** 系统 MUST 调用 `supabase.auth.signOut()`
- **AND** MUST 清空 Auth Context 的 `user` 状态
- **AND** MUST 调用 `queryClient.clear()` 清空 React Query 缓存
- **AND** MUST 广播 `SIGNED_OUT` 事件到其他标签页
- **AND** MUST 重定向到 `/chat`
- **AND** MUST 显示 Toast 提示"已退出登录"

### Requirement: 条件性数据请求
系统 SHALL 根据认证状态决定是否发起 API 请求，避免未认证时的无效请求。

#### Scenario: 未登录时不请求会话列表
- **WHEN** 用户未登录（`user === null`）
- **THEN** 侧边栏组件 MUST NOT 发起 `trpc.conversation.list.useQuery()` 请求
- **AND** MUST 显示友好提示"请先登录以查看历史记录"

#### Scenario: 登录后自动请求会话列表
- **WHEN** 用户登录完成（`user !== null`）
- **THEN** 侧边栏组件 MUST 自动发起 `trpc.conversation.list.useQuery()` 请求
- **AND** MUST 显示 Loading 状态
- **AND** 请求完成后 MUST 渲染会话列表

