# 学习模块首屏优化与鉴权下沉（Proposal）

## 背景与问题
- 当前 `/learn/[learningId]` 在 SSR 阶段执行 `createContext()` 与多次 DB 查询，首屏 TTFB 被鉴权与数据访问阻塞。
- `/api/learn/*` 每次请求都会再次 `supabase.auth.getUser()`，与 Middleware 及 SSR 形成重复鉴权。
- Middleware 目前仅覆盖 `/api/trpc/:path*`，学习模块的 API 请求未被统一鉴权入口覆盖。

## 目标
- **首屏优化**：学习页 SSR 仅渲染壳，不再执行重鉴权与重查询。
- **鉴权下沉**：由 Middleware 统一处理 `/api/learn/*` 的强鉴权，并减少重复 `getUser()`。
- **保持行为不变**：学习流程语义不变，仅做性能优化。
- **全局错误处理**：tRPC 客户端统一处理 `UNAUTHORIZED`，以页内卡片提示登录。

## 范围
- 新增学习页初始状态入口（tRPC `learning.getState`）。
- 调整 Middleware 覆盖学习模块 API。
- 调整学习页数据加载方式为 CSR 拉取。
- 复用 Middleware 鉴权结果（API 端优先读取）。
- tRPC 客户端全局错误处理（`UNAUTHORIZED` → 登录卡片）。

## 非目标
- 不调整数据库 schema 与学习业务语义。
- 不变更 `/chat` 模块与其路由。
- 不引入新的业务能力（仅性能优化）。

## 风险与对策
- **首屏空壳体验**：需要配套 Skeleton/Loading 状态，避免白屏。
- **鉴权复用失败**：保留 API 端 `getUser()` 的 fallback 以保证正确性。

## 验证方式（高层）
- 访问 `/learn/[learningId]` 首屏不再阻塞鉴权与 DB 访问。
- `/api/learn/*` 请求仅发生一次 `getUser()`（优先复用 Middleware）。
- 功能路径保持一致：澄清 → 生成 Plan → 互动对话不变。
