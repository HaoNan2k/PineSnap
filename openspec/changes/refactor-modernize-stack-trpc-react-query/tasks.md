# Tasks: 技术栈现代化实施清单

## Phase 1: 基础设施搭建（2-3 小时）

### 1.1 安装依赖
- [ ] 安装 tRPC 相关包
  ```bash
  pnpm add @trpc/server @trpc/client @trpc/react-query @trpc/next
  ```
- [ ] 安装 React Query
  ```bash
  pnpm add @tanstack/react-query@5
  ```
- [ ] 安装 Toast 通知
  ```bash
  pnpm add sonner
  ```
- [ ] 移除 SWR
  ```bash
  pnpm remove swr
  ```

### 1.2 创建 tRPC 基础结构
- [ ] 创建 `server/context.ts`（tRPC context）
- [ ] 创建 `server/trpc.ts`（初始化、procedures）
- [ ] 创建 `server/index.ts`（root router）
- [ ] 创建 `server/routers/conversation.ts`（会话 router）
- [ ] 创建 `app/api/trpc/[trpc]/route.ts`（Next.js adapter）

### 1.3 创建 tRPC Client
- [ ] 创建 `lib/trpc/client.ts`（tRPC client 配置）
- [ ] 创建 `lib/trpc/react.tsx`（React hooks）
- [ ] 在 `app/layout.tsx` 包裹 `TRPCProvider`

### 1.4 修复 Supabase Session 管理
- [ ] 修复 `lib/supabase/server.ts` 的 `setAll()` 实现
  - 当前是空函数 `setAll() {}`
  - 改为正确实现：遍历 cookiesToSet 并调用 `cookieStore.set()`
- [ ] 测试 Session 持久化是否正常

### 1.5 添加 Next.js Middleware
- [ ] 创建 `middleware.ts`（根目录）
- [ ] 实现统一认证检查逻辑
- [ ] 配置保护路由：`/chat/c/`, `/api/trpc/conversation.*`, `/api/trpc/message.*`
- [ ] 测试：未登录访问 `/chat/c/123` 应重定向到 `/chat?unauthorized=true`

## Phase 2: 认证系统完善（2-3 小时）

### 2.1 创建 Auth Context Provider
- [ ] 创建 `components/auth/auth-provider.tsx`
- [ ] 实现 `onAuthStateChange` 监听
- [ ] 实现自动 Token 刷新（检测过期前 5 分钟）
- [ ] 实现多标签页状态同步（BroadcastChannel）
- [ ] 导出 `useAuth` hook

### 2.2 集成 Auth Provider
- [ ] 在 `app/layout.tsx` 包裹 `AuthProvider`
- [ ] 传递环境变量：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 修改 `app/chat/page.tsx`：使用 `useAuth()` 替代服务端检查

### 2.3 测试认证流程
- [ ] 登录流程：发送 OTP → 跳转 callback → 设置 Session → 跳转 /chat
- [ ] Session 持久化：刷新页面后仍保持登录
- [ ] Token 刷新：等待 1 小时（或手动修改过期时间）测试自动刷新
- [ ] 多标签页：标签页 A 登录 → 标签页 B 自动更新状态
- [ ] 登出流程：点击登出 → 清空状态 → 跳转 /chat

## Phase 3: API 迁移到 tRPC（3-4 小时）

### 3.1 迁移 Conversation List API
- [ ] 在 `server/routers/conversation.ts` 添加 `list` procedure
  ```typescript
  list: protectedProcedure.query(({ ctx }) => getUserConversations(ctx.user.id))
  ```
- [ ] 修改 `components/sidebar/sidebar-history.tsx`
  - 移除 `import useSWR from 'swr'`
  - 替换为 `trpc.conversation.list.useQuery()`
  - 移除 `fetcher` 函数
  - 配置条件性请求：`enabled: !!user`
- [ ] 测试：侧边栏加载会话列表
- [ ] 删除 `app/api/conversations/route.ts` 的 `GET` handler

### 3.2 迁移 Conversation Update API
- [ ] 在 `server/routers/conversation.ts` 添加 `update` mutation
- [ ] 修改 `components/sidebar/sidebar-history.tsx` 的 `handleRename`
  - 替换为 `trpc.conversation.update.useMutation()`
  - 实现乐观更新（`onMutate`）
- [ ] 测试：重命名会话，立即反映到 UI
- [ ] 删除 `app/api/conversations/[id]/route.ts` 的 `PATCH` handler

### 3.3 迁移 Conversation Delete API
- [ ] 在 `server/routers/conversation.ts` 添加 `delete` mutation
- [ ] 修改 `components/sidebar/sidebar-history.tsx` 的 `handleDelete`
  - 替换为 `trpc.conversation.delete.useMutation()`
  - 实现乐观更新
- [ ] 测试：删除会话，立即从列表移除
- [ ] 删除 `app/api/conversations/[id]/route.ts` 的 `DELETE` handler

### 3.4 迁移 Conversation Get API
- [ ] 在 `server/routers/conversation.ts` 添加 `get` procedure
- [ ] 修改 `app/chat/c/[id]/page.tsx`
  - 考虑保持服务端获取（SSR），或改为客户端获取
  - 如保持 SSR：调用 `conversationRouter` 的 caller
- [ ] 测试：访问 `/chat/c/123` 加载历史消息
- [ ] 删除旧的 API Route（如有独立文件）

### 3.5 配置 React Query 全局策略
- [ ] 在 `lib/trpc/react.tsx` 配置 `queryClient`
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error.data?.code === 'UNAUTHORIZED') return false
          return failureCount < 3
        },
        staleTime: 5000,
        refetchOnWindowFocus: false,
      },
    },
  })
  ```
- [ ] 测试：401 错误不再无限重试

## Phase 4: 用户体验优化（2-3 小时）

### 4.1 添加右上角用户菜单
- [ ] 创建 `components/user/user-menu.tsx`
  - Avatar 组件（显示用户邮箱首字母）
  - DropdownMenu（设置、帮助、退出）
- [ ] 修改 `components/chat/components/chat-area.tsx`
  - 在 header 右侧添加 `<UserMenu />`
  - 替换现有的 `MoreHorizontal` 按钮
- [ ] 实现登出功能
  ```typescript
  const signOut = async () => {
    await supabase.auth.signOut()
    queryClient.clear()
    router.push('/chat')
    toast.success('已退出登录')
  }
  ```

### 4.2 集成 Toast 通知
- [ ] 在 `app/layout.tsx` 添加 `<Toaster />`（来自 sonner）
- [ ] 在关键操作添加 Toast
  - 登录成功：`toast.success('登录成功')`
  - 登出成功：`toast.success('已退出登录')`
  - 会话重命名成功：`toast.success('已重命名')`
  - 会话删除成功：`toast.success('已删除')`
  - 错误提示：`toast.error(error.message)`

### 4.3 优化 Loading 状态
- [ ] 修改 `components/sidebar/sidebar-history.tsx`
  - 区分 `isAuthLoading` 和 `isDataLoading`
  - 优先显示认证加载状态
  - 未登录时显示友好提示（不显示 Loading）
- [ ] 添加 Skeleton 组件优化（如需要）

### 4.4 错误处理优化
- [ ] 创建错误处理 helper
  ```typescript
  function handleTRPCError(error: TRPCError) {
    if (error.data?.code === 'UNAUTHORIZED') {
      toast.error('会话已过期，请重新登录')
      router.push('/chat')
    } else {
      toast.error(error.message)
    }
  }
  ```
- [ ] 在所有 mutation 的 `onError` 中使用

### 4.5 登录页面优化
- [ ] 修改 `app/chat/page.tsx`
  - 检测 `searchParams.unauthorized`
  - 显示 Banner："会话已过期，请重新登录"
- [ ] 优化登录成功后的跳转
  - 支持 `returnUrl` 参数
  - 登录后跳转回原页面

## Phase 5: 清理与验证（1-2 小时）

### 5.1 删除冗余代码
- [ ] 删除 `app/api/conversations/` 目录（整个）
- [ ] 删除 `app/unauthorized.tsx`（不再需要）
- [ ] 删除 `app/forbidden.tsx`（不再需要）
- [ ] 删除 `lib/http/api.ts` 中的 `requireUserId`（改用 tRPC procedure）
- [ ] 检查并删除所有 `import useSWR` 引用

### 5.2 类型检查
- [ ] 运行 `pnpm tsc --noEmit`
- [ ] 修复所有类型错误

### 5.3 Linter 检查
- [ ] 运行 `pnpm lint`
- [ ] 修复所有 lint 错误

### 5.4 OpenSpec 验证
- [ ] 运行 `npx openspec validate refactor-modernize-stack-trpc-react-query --strict`
- [ ] 修复所有验证错误
- [ ] 运行 `npx openspec validate --all --strict`
- [ ] 确保整体 OpenSpec 一致性

## Phase 6: 回归测试（1-2 小时）

### 6.1 认证流程测试
- [ ] 未登录访问 `/chat` → 显示登录表单
- [ ] 未登录访问 `/chat/c/123` → 重定向到 `/chat?unauthorized=true`
- [ ] 输入邮箱 → 发送 OTP → 点击链接 → 登录成功
- [ ] 刷新页面 → 仍保持登录状态
- [ ] 打开多个标签页 → 登录/登出状态同步
- [ ] 点击退出登录 → Toast 提示 → 跳转到登录页

### 6.2 聊天功能测试
- [ ] 登录后进入 `/chat` → 显示"新对话"界面
- [ ] 发送首条消息 → URL 变为 `/chat/c/[id]`
- [ ] 流式响应正常显示
- [ ] 刷新页面 → 历史消息正确加载
- [ ] 继续追加消息 → 正常流式响应

### 6.3 侧边栏测试
- [ ] 侧边栏显示会话列表
- [ ] 发送消息后 → 侧边栏自动刷新（新会话出现）
- [ ] 点击侧边栏会话 → 跳转到对应 URL
- [ ] 重命名会话 → 立即反映到 UI
- [ ] 删除会话 → 立即从列表移除
- [ ] 搜索会话 → 过滤正常工作

### 6.4 用户菜单测试
- [ ] 右上角显示用户头像
- [ ] 点击头像 → 下拉菜单展开
- [ ] 菜单显示用户邮箱
- [ ] 点击"退出登录" → Toast 提示 → 跳转到登录页

### 6.5 错误场景测试
- [ ] 网络错误 → Toast 显示错误信息
- [ ] 401 错误 → Toast 提示"会话已过期" → 跳转登录页
- [ ] 404 错误（不存在的会话） → 显示 not-found 页面

### 6.6 性能测试
- [ ] 打开 React Query DevTools
- [ ] 观察请求去重是否生效
- [ ] 观察缓存是否正常工作
- [ ] 乐观更新是否立即反映到 UI
- [ ] 网络 tab 确认无无效的 401 请求

## 验收标准

所有以上任务完成后，项目应满足：
- ✅ 无 TypeScript 类型错误
- ✅ 无 ESLint 错误
- ✅ `openspec validate --all --strict` 通过
- ✅ 所有回归测试通过
- ✅ 无 401 循环请求
- ✅ 用户体验流畅、友好
- ✅ 代码无冗余、无兼容性 hack

