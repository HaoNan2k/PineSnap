# learning.getState 崩溃修复 + 本地 Supabase 开发环境（2026-04-17）

## 背景

基于 2026-04-16 的优化后，继续在浏览器中逐页面排查性能。发现 `/learn/[id]` 页面的 `learning.getState` tRPC 调用**直接超时崩溃**（"Connection terminated unexpectedly"），页面无法使用。同时还发现本地开发与远程数据库之间的延迟严重影响调试效率。

## 发现的具体问题

### 问题 1：learning.getState 超时崩溃

**根因**：`server/routers/learning.ts` 中 `getState` 复用了 `getLearningWithAccessCheck`，该查询嵌套加载了每个 resource 的 captureJobs → artifacts → content（大 JSON），但 `getState` 返回值实际上只需要 `resource.title`。
另外还发现：
- `ensureLearningConversation` 额外发一次 DB 查询，但 `conversations` 数据在第一次查询时已经被加载
- `getConversation` 加载所有消息无上限
- 四步骤全部顺序 await

**修复**：
- 新增 `lib/db/learning.ts:getLearningStateLight`：剔除 captureJobs / artifacts / metadata，仅查 UI 真正用到的字段
- `getState` 从已返回的 `learning.conversations` 中直接取 conversationId，跳过 `ensureLearningConversation` 的独立查询

### 问题 2：本地开发的远程 DB 延迟无法根除

**根因**：Next.js 开发服务器跑在本地（中国），Supabase DB 在新加坡。Prisma 的嵌套 `include` 会拆成多条独立 SQL，每条一次网络往返（~500ms）。即使用 `getLearningStateLight` 把查询简化到最小，`getLearningMs` 仍稳定在 **4.7-5.3 秒**，这是 Prisma + 跨区域 DB 的固有问题。

**数据**：

| 步骤 | 优化前（超时） | getLearningStateLight 后 | 本地 Supabase |
|------|---------------|-------------------------|--------------|
| getLearningMs | — | 4733ms | ~10ms |
| ensureConvMs | — | 2ms（跳过独立查询） | ~1ms |
| getConvMs | — | 669ms | ~1ms |
| **总耗时** | **>10s（崩溃）** | **5402ms** | **15-46ms** |

**业界方案对比**：

| 方案 | 本地延迟 | 改动量 | 生产受益 |
|------|---------|--------|---------|
| Prisma `relationJoins` 预览特性 | ~1s | 极小 | 是 |
| Prisma Accelerate | 100-300ms | 小 | 是（全球缓存） |
| **本地 Supabase** | **0ms** | 中（一次性配置） | 否（仅开发） |
| Drizzle ORM 替代 | 未测 | 大（重写） | 是 |

选择本地 Supabase：彻底消除延迟、统一本地开发环境、业界标准方案、离线可用。

### 问题 3：客户端仍在调用 Supabase 远程 Auth API

**根因**：上次优化只处理了服务端的 `getUser()` → `getClaims()` 迁移。浏览器端 Supabase SDK 仍会周期性调用 `/auth/v1/token` 刷新 token（每次 ~2s）和 `/auth/v1/user` 获取用户信息。

**状态**：尚未修复，记录待办。这个属于 Supabase 客户端 SDK 的默认行为，可选的缓解是调整 `autoRefreshToken` 或减少调用频率。

## 验证

整体请求耗时（本地 Supabase + 代码优化）：

| 端点 | 远程 Supabase（优化后） | 本地 Supabase | 提升 |
|------|----------------------|--------------|------|
| `/sources` SSR | 38ms | 18-44ms | 持平 |
| `resource.list` | 2819ms | 10-25ms | **~280x** |
| `learning.getState` | 5402ms（未崩溃时） | 15-46ms | **~360x** |

## 本地 Supabase 开发环境配置

见决策文档 `../decisions/0001-local-supabase-dev-env.md`。核心步骤：

1. `brew install supabase/tap/supabase`
2. `supabase init` → `supabase link --project-ref <ref>` → `supabase db pull`
3. `supabase start`（Docker 拉取镜像，首次 10-30 分钟）
4. `prisma migrate deploy` 把 schema 应用到本地
5. 创建 `.env.local`（覆盖 `.env` 中的 Supabase 和 DB URL）
6. 从远程 dev 库导入测试数据（`pg_dump --data-only --column-inserts`）

**代码零改动**，全部通过环境变量切换。删除 `.env.local` 即可切回远程。

## 回滚 / 风险

- `getLearningStateLight`：严格仅在 `getState` 使用，其他需要 artifact content 的调用（generateClarify / generatePlan / chat route）仍用完整 `getLearningWithAccessCheck`，不受影响
- 本地 Supabase 与远程数据完全隔离，污染本地不会影响远程
- 本地 encrypted_password 是从远程导入的，若远程 password 被改，本地需重新导入或重设

## 涉及文件

- `lib/db/learning.ts` — 新增 `getLearningStateLight`
- `server/routers/learning.ts` — `getState` 切换到轻量查询、跳过 `ensureLearningConversation`
- `.env.local`（未入库）— 本地 Supabase 连接覆盖
