# chat-ui Capability Delta Spec

## MODIFIED Requirements

### Requirement: 右上角用户菜单
系统 SHALL 在聊天界面右上角显示用户菜单，提供用户信息和操作入口。

#### Scenario: 未登录时显示登录提示
- **WHEN** 用户未登录（访问 `/chat`）
- **THEN** 右上角 MUST NOT 显示用户菜单
- **AND** 页面中心 MUST 显示登录表单

#### Scenario: 已登录时显示用户头像
- **WHEN** 用户已登录
- **THEN** 聊天界面右上角 MUST 显示用户头像
- **AND** 头像 MUST 显示用户邮箱的首字母（大写）
- **AND** 头像 MUST 有圆形边框和背景色

#### Scenario: 点击头像展开下拉菜单
- **WHEN** 用户点击右上角头像
- **THEN** 系统 MUST 展开下拉菜单
- **AND** 菜单 MUST 包含以下项目：
  - 用户信息区（显示邮箱）
  - 分隔线
  - "设置"选项（灰色，暂不可用）
  - "帮助文档"选项（灰色，暂不可用）
  - "退出登录"选项（红色文字）
- **AND** 菜单 MUST 对齐到头像右侧

#### Scenario: 点击退出登录
- **WHEN** 用户点击下拉菜单中的"退出登录"
- **THEN** 系统 MUST 调用 `supabase.auth.signOut()`
- **AND** MUST 清空 Auth Context 的 `user` 状态
- **AND** MUST 清空 React Query 缓存
- **AND** MUST 广播 `SIGNED_OUT` 事件
- **AND** MUST 显示 Toast 提示"已退出登录"
- **AND** MUST 重定向到 `/chat`
- **AND** 下拉菜单 MUST 自动关闭

### Requirement: Toast 通知系统
系统 SHALL 使用 Sonner 提供全局 Toast 通知，反馈关键操作结果。

#### Scenario: 登录成功显示 Toast
- **WHEN** 用户完成 OTP 验证并登录成功
- **THEN** 系统 MUST 显示 Toast 提示"登录成功"
- **AND** Toast MUST 自动在 3 秒后消失
- **AND** Toast MUST 显示在屏幕右下角

#### Scenario: 登出成功显示 Toast
- **WHEN** 用户点击退出登录
- **THEN** 系统 MUST 显示 Toast 提示"已退出登录"
- **AND** Toast MUST 在跳转到登录页前显示

#### Scenario: 会话操作成功显示 Toast
- **WHEN** 用户重命名会话成功
- **THEN** 系统 MUST 显示 Toast 提示"已重命名"
- **AND** WHEN 用户删除会话成功
- **THEN** 系统 MUST 显示 Toast 提示"已删除"

#### Scenario: 错误时显示 Toast
- **WHEN** tRPC mutation 失败
- **THEN** 系统 MUST 显示 Toast 错误提示
- **AND** Toast MUST 使用红色主题
- **AND** Toast 内容 MUST 根据错误类型显示：
  - `UNAUTHORIZED` → "会话已过期，请重新登录"
  - `FORBIDDEN` → "无权限执行此操作"
  - `NOT_FOUND` → "资源不存在"
  - 其他 → 显示 `error.message`

### Requirement: 侧边栏条件性加载
系统 SHALL 根据认证状态决定侧边栏的渲染内容，避免未登录时的无效请求。

#### Scenario: 未登录时显示友好提示
- **WHEN** 用户未登录
- **THEN** 侧边栏 MUST NOT 调用 `trpc.conversation.list.useQuery()`
- **AND** 侧边栏 MUST 显示友好提示："请先登录以查看历史记录"
- **AND** MUST NOT 显示 Loading 骨架屏

#### Scenario: 登录中显示 Loading 状态
- **WHEN** Auth Context 的 `isLoading === true`
- **THEN** 侧边栏 MUST 显示 Loading 骨架屏
- **AND** MUST NOT 显示登录提示或会话列表

#### Scenario: 已登录时加载会话列表
- **WHEN** 用户已登录（`user !== null`）
- **THEN** 侧边栏 MUST 调用 `trpc.conversation.list.useQuery()`
- **AND** 加载中 MUST 显示 Loading 骨架屏
- **AND** 加载完成 MUST 渲染会话列表
- **AND** 列表为空 MUST 显示"暂无历史记录"

### Requirement: React Query 全局配置
系统 SHALL 配置 React Query 的全局策略，优化数据获取行为。

#### Scenario: 401 错误不重试
- **WHEN** tRPC query 返回 `UNAUTHORIZED` 错误
- **THEN** React Query MUST NOT 重试该请求
- **AND** MUST 立即进入 error 状态

#### Scenario: 服务器错误重试 3 次
- **WHEN** tRPC query 返回 5xx 错误
- **THEN** React Query MUST 重试最多 3 次
- **AND** 每次重试间隔 MUST 递增（指数退避）

#### Scenario: 窗口焦点时不自动刷新
- **WHEN** 用户切换回浏览器标签页
- **THEN** React Query MUST NOT 自动重新获取数据
- **AND** 用户 MUST NOT 看到界面闪烁

#### Scenario: 数据去重 5 秒
- **WHEN** 5 秒内发起多次相同请求
- **THEN** React Query MUST 只发送一次实际请求
- **AND** 所有调用者 MUST 共享同一份数据

### Requirement: 登录页面优化
系统 SHALL 优化登录页面的用户体验，提供更好的反馈和引导。

#### Scenario: 显示"会话已过期"提示
- **WHEN** 用户因 Middleware 重定向到 `/chat?unauthorized=true`
- **THEN** 登录页面 MUST 显示黄色 Banner："会话已过期，请重新登录"
- **AND** Banner MUST 显示在登录表单上方
- **AND** Banner MUST 可被关闭

#### Scenario: 登录成功后跳转回原页面
- **WHEN** 用户从 `/chat/c/123` 被重定向到 `/chat?unauthorized=true&returnUrl=/chat/c/123`
- **AND** 用户完成登录
- **THEN** 系统 MUST 跳转到 `returnUrl`（即 `/chat/c/123`）
- **AND** MUST NOT 跳转到默认的 `/chat`

### Requirement: 移除 SWR 依赖
系统 SHALL 完全移除 SWR 依赖，所有数据获取使用 React Query。

#### Scenario: 代码中无 SWR 引用
- **WHEN** 完成迁移后
- **THEN** 代码库中 MUST NOT 存在 `import useSWR`
- **AND** `package.json` MUST NOT 包含 `swr` 依赖
- **AND** 所有数据获取 MUST 使用 `trpc.*.useQuery()` 或 `trpc.*.useMutation()`

