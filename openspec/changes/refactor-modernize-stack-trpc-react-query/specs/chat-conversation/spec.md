# chat-conversation Capability Delta Spec

## MODIFIED Requirements

### Requirement: API 层迁移到 tRPC
系统 SHALL 使用 tRPC 替代传统 Next.js API Routes，实现端到端类型安全的 API 通信。

#### Scenario: 获取会话列表通过 tRPC
- **WHEN** 客户端需要获取用户的会话列表
- **THEN** 客户端 MUST 调用 `trpc.conversation.list.useQuery()`
- **AND** tRPC MUST 自动推断返回类型为 `Conversation[]`
- **AND** 服务端 MUST 通过 `protectedProcedure` 自动验证认证状态
- **AND** MUST 调用 `getUserConversations(ctx.user.id)` 获取数据
- **AND** MUST NOT 手动调用 `requireUserId()` 或处理认证逻辑

#### Scenario: 更新会话标题通过 tRPC
- **WHEN** 客户端需要更新会话标题
- **THEN** 客户端 MUST 调用 `trpc.conversation.update.useMutation({ id, title })`
- **AND** 输入参数 MUST 通过 Zod schema 自动验证（`id: z.string().uuid()`, `title: z.string().min(1)`）
- **AND** tRPC MUST 在类型不匹配时编译错误（而非运行时错误）
- **AND** 服务端 MUST 验证用户权限后执行更新

#### Scenario: 删除会话通过 tRPC
- **WHEN** 客户端需要删除会话
- **THEN** 客户端 MUST 调用 `trpc.conversation.delete.useMutation({ id })`
- **AND** 客户端 MUST 实现乐观更新（`onMutate` 中立即从列表移除）
- **AND** 删除失败时 MUST 回滚乐观更新（`onError` 中恢复列表）
- **AND** 服务端 MUST 验证用户权限后执行逻辑删除（`deletedAt` 设置为当前时间）

### Requirement: 认证逻辑统一到 protectedProcedure
系统 SHALL 通过 tRPC 的 `protectedProcedure` 统一处理认证，避免在每个 API handler 中重复认证代码。

#### Scenario: protectedProcedure 自动检查认证
- **WHEN** tRPC procedure 使用 `protectedProcedure` 定义
- **THEN** tRPC MUST 在执行 procedure 前检查 `ctx.user`
- **AND** 若 `ctx.user === null`
  - **THEN** MUST 抛出 `TRPCError({ code: 'UNAUTHORIZED' })`
  - **AND** 客户端 MUST 收到结构化错误（`error.data.code === 'UNAUTHORIZED'`）
- **AND** 若 `ctx.user !== null`
  - **THEN** MUST 将类型收窄后的 `ctx.user` 传递给 procedure
  - **AND** procedure 内部 MUST 能安全访问 `ctx.user.id` 而无需类型断言

#### Scenario: 移除旧的 requireUserId 调用
- **WHEN** API 迁移到 tRPC 后
- **THEN** 代码中 MUST NOT 存在 `requireUserId()` 调用
- **AND** `lib/http/api.ts` 中的 `requireUserId` 函数 MAY 被删除（若无其他用途）

### Requirement: tRPC Context 提供 Supabase client 和 user
系统 SHALL 在 tRPC context 中提供 Supabase client 和当前用户信息。

#### Scenario: Context 创建时获取用户
- **WHEN** tRPC 创建 context（每个请求）
- **THEN** 系统 MUST 调用 `createSupabaseServerClient()` 获取 Supabase client
- **AND** MUST 调用 `supabase.auth.getUser()` 获取当前用户
- **AND** MUST 返回 `{ supabase, user: user ?? null }`
- **AND** 所有 procedures MUST 能通过 `ctx.supabase` 和 `ctx.user` 访问

### Requirement: 错误处理结构化
系统 SHALL 通过 tRPC 的结构化错误机制提供更好的错误处理体验。

#### Scenario: 客户端区分不同错误类型
- **WHEN** tRPC procedure 抛出错误
- **THEN** 客户端 MUST 能通过 `error.data.code` 区分错误类型
  - `'UNAUTHORIZED'` → 显示"会话已过期，请重新登录"
  - `'FORBIDDEN'` → 显示"无权限访问"
  - `'NOT_FOUND'` → 显示"会话不存在"
  - `'INTERNAL_SERVER_ERROR'` → 显示通用错误消息
- **AND** React Query MUST NOT 对 `UNAUTHORIZED` 和 `FORBIDDEN` 错误重试

### Requirement: 乐观更新提升用户体验
系统 SHALL 利用 React Query 的乐观更新能力，使会话操作立即反映到 UI。

#### Scenario: 乐观更新会话标题
- **WHEN** 用户重命名会话
- **THEN** 客户端 MUST 在 `onMutate` 中立即更新本地缓存
- **AND** UI MUST 立即显示新标题（无需等待服务端响应）
- **AND** 若服务端请求失败
  - **THEN** MUST 在 `onError` 中回滚到旧标题
  - **AND** MUST 显示 Toast 错误提示
- **AND** 若服务端请求成功
  - **THEN** MUST 在 `onSettled` 中重新验证缓存

#### Scenario: 乐观删除会话
- **WHEN** 用户删除会话
- **THEN** 客户端 MUST 在 `onMutate` 中立即从列表移除该会话
- **AND** UI MUST 立即更新（无动画延迟）
- **AND** 若服务端请求失败
  - **THEN** MUST 在 `onError` 中恢复会话到列表
  - **AND** MUST 显示 Toast 错误提示

