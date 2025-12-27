# Design: 技术栈现代化架构设计

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│ Client Layer                                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Auth Context Provider (client)                       │  │
│  │  - Supabase onAuthStateChange 监听                   │  │
│  │  - 自动 Token 刷新                                    │  │
│  │  - 多标签页同步（BroadcastChannel）                  │  │
│  │  - 提供全局 user/isLoading 状态                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ tRPC Client + React Query                            │  │
│  │  - 自动类型推断                                       │  │
│  │  - 智能缓存和去重                                     │  │
│  │  - 条件性请求（based on auth state）                 │  │
│  │  - 乐观更新                                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP Request
┌─────────────────────────────────────────────────────────────┐
│ Next.js Middleware (Edge Runtime)                          │
│  - 统一认证检查                                             │
│  - 保护路由：/chat/c/*, /api/trpc/conversation.*           │
│  - 未认证 → 重定向 /chat?unauthorized=true                 │
│  - 已认证 → 放行                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ tRPC Layer                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Context (server/context.ts)                          │  │
│  │  - 提供 Supabase client                              │  │
│  │  - 提供 user 信息（if authenticated）                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Procedures                                            │  │
│  │  - publicProcedure（无需认证）                        │  │
│  │  - protectedProcedure（自动检查 ctx.user）           │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Routers                                               │  │
│  │  - conversationRouter (list, get, update, delete)    │  │
│  │  - messageRouter (send, regenerate)                  │  │
│  │  - authRouter (signOut, getUser)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Data Layer (lib/db/*)                                       │
│  - conversation.ts (复用现有函数)                           │
│  - message.ts (复用现有函数)                                │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件设计

### 1. Next.js Middleware

**职责**：作为统一认证网关，在请求到达页面/API 前拦截并验证

**实现要点**：
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()
  
  const protectedPaths = ['/chat/c/', '/api/trpc/conversation', '/api/trpc/message']
  const isProtected = protectedPaths.some(p => pathname.startsWith(p))
  
  if (isProtected && !user) {
    // 未认证 → 重定向或返回 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/chat?unauthorized=true', request.url))
  }
  
  return NextResponse.next()
}
```

### 2. Auth Context Provider

**职责**：客户端全局认证状态管理

**关键特性**：
- 监听 `onAuthStateChange` 实时更新状态
- 自动刷新 Token（检测过期前 5 分钟刷新）
- 多标签页同步（使用 BroadcastChannel API）
- 提供 `user`、`isLoading`、`signOut` 等接口

**状态流转**：
```
初始化 → Loading → 已登录/未登录
         ↓
    onAuthStateChange
         ↓
    自动更新状态 + 广播到其他标签页
```

### 3. tRPC Context

**职责**：为每个请求提供上下文（Supabase client + user）

**实现**：
```typescript
// server/context.ts
export async function createContext({ req, res }: CreateNextContextOptions) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  return {
    supabase,
    user: user ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
```

### 4. Protected Procedure

**职责**：自动检查认证状态的 tRPC procedure

**实现**：
```typescript
// server/trpc.ts
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return opts.next({
    ctx: {
      ...opts.ctx,
      user: opts.ctx.user,  // 类型收窄，确保非 null
    },
  })
})
```

### 5. Conversation Router

**职责**：会话相关的所有 API 逻辑

**接口设计**：
```typescript
export const conversationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserConversations(ctx.user.id)
  }),
  
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return getConversationWithAccessCheck(input.id, ctx.user.id)
    }),
  
  update: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return updateConversation(input.id, input.title, ctx.user.id)
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return deleteConversation(input.id, ctx.user.id)
    }),
})
```

## 数据流设计

### 认证流程

```
1. 用户打开应用
   ↓
2. Auth Context 初始化
   - 调用 supabase.auth.getUser()
   - 设置 isLoading = false
   ↓
3. 用户访问 /chat/c/123
   ↓
4. Middleware 检查认证
   - 已登录 → 放行
   - 未登录 → 重定向到 /chat?unauthorized=true
   ↓
5. 页面加载，tRPC 请求
   - trpc.conversation.get.useQuery({ id: '123' })
   - 自动携带 Cookie
   ↓
6. tRPC Context 获取 user
   - protectedProcedure 自动校验
   - 返回数据
```

### Session 刷新流程

```
1. Auth Context 监听 onAuthStateChange
   ↓
2. 检测到 TOKEN_REFRESHED 事件
   ↓
3. 更新本地 user 状态
   ↓
4. 广播到其他标签页（BroadcastChannel）
   ↓
5. 其他标签页接收到消息，同步更新状态
```

### 登出流程

```
1. 用户点击"退出登录"
   ↓
2. 调用 supabase.auth.signOut()
   ↓
3. Auth Context 监听到 SIGNED_OUT 事件
   ↓
4. 清空 user 状态
   ↓
5. 清空 React Query 缓存（queryClient.clear()）
   ↓
6. 广播到其他标签页
   ↓
7. 重定向到 /chat
   ↓
8. Toast 提示"已退出登录"
```

## 文件结构

```
server/
├── context.ts              # tRPC context 创建
├── trpc.ts                 # tRPC 初始化、procedures 定义
├── index.ts                # Root router
└── routers/
    ├── conversation.ts     # 会话相关 API
    ├── message.ts          # 消息相关 API（如需要）
    └── auth.ts             # 认证相关 API

lib/
├── trpc/
│   ├── client.ts           # tRPC client 配置
│   └── react.tsx           # tRPC React hooks
└── supabase/
    ├── server.ts           # 修复 setAll()
    └── auth.ts             # 保持不变

components/
├── auth/
│   ├── auth-provider.tsx   # Auth Context Provider
│   └── login-card.tsx      # 保持不变
└── user/
    └── user-menu.tsx       # 右上角用户菜单

app/
├── api/
│   └── trpc/
│       └── [trpc]/
│           └── route.ts    # tRPC Next.js adapter
└── chat/
    └── ...                 # 保持现有结构

middleware.ts               # 新增：统一认证网关
```

## 迁移策略

### 阶段 1：基础设施（无破坏性）
1. 安装依赖
2. 创建 tRPC 基础设施（server/、lib/trpc/）
3. 修复 `lib/supabase/server.ts` 的 `setAll()`
4. 添加 Middleware

### 阶段 2：Auth Context（可并行）
1. 创建 Auth Provider
2. 在 `app/layout.tsx` 包裹 Provider
3. 测试登录/登出/刷新流程

### 阶段 3：API 迁移（逐个替换）
1. 创建 `conversationRouter`
2. 前端替换 `/api/conversations` 为 `trpc.conversation.list.useQuery()`
3. 测试侧边栏刷新
4. 删除旧的 `/api/conversations/route.ts`
5. 重复上述步骤迁移其他 API

### 阶段 4：UI 优化
1. 添加右上角用户菜单
2. 集成 Toast（sonner）
3. 优化错误处理和 Loading 状态

## 类型安全示例

### 修改前（手动维护）
```typescript
// 后端改了返回结构
return Response.json({ data: conversations, count: 10 })

// 前端类型没更新，运行时才报错
const { data } = useSWR<Conversation[]>('/api/conversations', fetcher)
data.map(...)  // ❌ 运行时错误：data.map is not a function
```

### 修改后（自动同步）
```typescript
// 后端改了返回结构
return { data: conversations, count: 10 }

// 前端立即编译错误
const { data } = trpc.conversation.list.useQuery()
data.map(...)  // ✅ 编译错误：data.map 不存在
```

## 性能优化

1. **去重请求**：React Query 自动去重 5 秒内的相同请求
2. **条件性请求**：未登录时不发起任何 API 请求
3. **乐观更新**：重命名/删除会话立即反映到 UI
4. **SSR 优化**：tRPC 支持 SSR 预取（未来可选）

## 兼容性考虑

- **无兼容性代码**：完全移除 SWR，不保留旧 API Routes
- **一次性迁移**：所有 API 统一迁移到 tRPC，避免混合架构
- **类型收窄**：利用 TypeScript 的类型收窄能力，确保 `ctx.user` 在 `protectedProcedure` 中非 null

