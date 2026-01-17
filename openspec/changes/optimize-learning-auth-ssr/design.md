# 学习模块首屏优化与鉴权下沉（Design）

## 现状链路（学习页）
1. 请求 `/learn/[learningId]` → SSR 执行：
   - `createContext()` → `supabase.auth.getUser()`
   - `getLearningWithAccessCheck()`（多次 DB）
   - `ensureLearningConversation()` + `getConversation()` + `convertDbToUIMessages()`
2. 客户端加载后再请求 `/api/learn/clarify`、`/api/learn/plan`、`/api/learn/chat`
   - 每次 API 内部再次 `getAuthenticatedUserId()`（重复鉴权）

## 目标链路（拟议）
1. `/learn/[learningId]` SSR **仅渲染壳**，不做鉴权与 DB 查询。
2. 客户端在页面加载后调用 **tRPC `learning.getState`** 获取初始数据：
   - learning 核心信息（plan / clarify）
   - resources 列表
   - conversationId
   - initialMessages
3. Middleware 覆盖 `/api/learn/*`，统一鉴权。
4. `/api/learn/*` 复用 Middleware 鉴权结果（如 `x-ps-user-id`），无则 fallback `getAuthenticatedUserId()`。
5. tRPC 客户端对 `UNAUTHORIZED` 进行全局处理，统一展示 `LoginCard`（页内卡片）。

## tRPC 契约（新增）
### `learning.getState`
**Input**
```json
{ "learningId": "uuid" }
```

**Output**
```json
{
  "learning": { "id": "uuid", "plan": "string|null", "clarify": "ClarifyPayload|null" },
  "resources": [{ "id": "uuid", "title": "string", "type": "string", "content": "unknown" }],
  "conversationId": "uuid",
  "initialMessages": "UIMessage[]"
}
```

**Error**
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `BAD_REQUEST`

## 鉴权下沉策略
- Middleware 对 `/api/learn/:path*` 进行 `getUser()`：
  - 未登录返回 `401 JSON`
  - 登录态透传 `userId`（如 `x-ps-user-id` header）
- API 端优先读取该 header，缺失时调用 `getAuthenticatedUserId()` 兜底。

## SSR/CSR 策略
- `LearnPage` SSR 仅渲染框架与 Loading/Skeleton。
- `LearnFocus`（或新的数据容器组件）在客户端请求 `learning.getState` 并注入数据。
 - tRPC 全局错误处理负责渲染登录卡片，页面层仅保留通用错误兜底。

## 兼容性与迁移
- 保持 `/api/learn/clarify`、`/api/learn/plan`、`/api/learn/chat` 语义不变。
- 不改变 Prisma schema 与 DB 数据结构。
- 不涉及 `/chat` 模块。

## 风险与缓解
- **首屏空壳**：增加 Skeleton 与错误兜底。
- **鉴权复用失败**：保留 server fallback。
 - **全局错误处理误伤**：仅对 `UNAUTHORIZED` 启用登录卡片，其他错误保持页面兜底提示。
