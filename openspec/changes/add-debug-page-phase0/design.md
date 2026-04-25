## Context

PineSnap 当前 learning 流程的状态分散在 `Learning` + 两条 `Conversation`（canvas / chat）+ 多条 `Message` 表里，且 chat 消息通过 `anchoredCanvasMessageId` 反向引用 canvas 消息。开发者排查问题时只能手写 SQL 或者翻 server log，门槛高。

关键约束：
- 项目使用 Supabase 做认证，**Prisma schema 里没有 `User` 模型**——`userId` 在所有业务表里以裸 string FK 存在；用户记录在 Supabase `auth.users` 由 Supabase 管理
- tRPC context 当前只解析 `user.id`，不读 role（`server/context.ts:9-25`）
- 现有 `protectedProcedure` 只检查登录态，没有 role 维度（`server/trpc.ts:22-32`）
- learning 通常包含 ≤ 100 条消息，体量小，不需要分页

Phase 0 范围：纯 DB 读取的 admin-only 内部页，能看到原始数据 + 粗粒度耗时；不接 Langfuse/OTel。

## Goals / Non-Goals

**Goals:**
- 半天到一天内能跑起来，让开发者立刻能用
- 显示完整原始数据（不翻译、不省略字段），符合开发者向工具的密度感
- 严格 admin-only，避免误展示用户数据
- 架构上为 Phase 1（Langfuse 接入）预留 trace 入口位

**Non-Goals:**
- 性能/用量统计 dashboard
- Trace 细粒度耗时（Phase 1 才有）
- React 状态/UX 事件埋点
- 编辑/删除/恢复消息能力
- Capture worker debug
- 单元测试（debug 工具，手动验证）

## Decisions

### Decision 1: Admin role 用 Supabase `app_metadata.role`，而不是新增 Prisma 表

**选择**：在 Supabase `auth.users.app_metadata` 里塞 `{ "role": "admin" }`；服务端从 `supabase.auth.getUser()` 返回的 user 对象里读 `app_metadata.role`。

**理由**：
- 项目里**根本没有 Prisma `User` 表**，新建一张 `UserRole` 表只为 1-2 个 admin 用户太重
- `app_metadata` 不可被客户端修改，只能用 service role key 写入——天然安全
- Supabase 原生方案，不引入新概念

**初次 admin 怎么设**：用一条 SQL 直接改：
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
WHERE email = 'manjurpontjo@hotmail.com';
```
（写到 `docs/platform/admin-role-setup.md` 留作运维记录）

**Alternatives 拒掉的**：
- ❌ 新增 `UserRole` Prisma 表：过度设计
- ❌ 环境变量 `ADMIN_USER_IDS`：每次加 admin 都要改部署，且明文 ID 在 env 里管理混乱
- ❌ 在某张现有业务表（如 `Learning`）里加 role：语义错位

### Decision 2: Context 增加 `role`，新增 `adminProcedure`

**选择**：
- `server/context.ts` 在解析 user 之后，从 supabase 返回的 user 对象里取 `app_metadata.role`，挂到 `ctx.user.role`
- `server/trpc.ts` 新增 `adminProcedure = protectedProcedure.use(...)`，role !== "admin" 抛 `FORBIDDEN`
- `server/routers/debug.ts` 所有 procedure 用 `adminProcedure`

**为什么不在每个 debug procedure 内部检查**：
- 集中检查避免遗漏
- `adminProcedure` 复用性强，未来其它 admin-only 接口直接用

**性能**：context 当前已经走 header-fast-path（`x-ps-user-id`），role 读取需要在 fast-path 失效时多一次 supabase 调用——但 admin 路由访问极低频，可接受。后续可在 middleware 里把 role 也注入 header。

### Decision 3: 路由结构 = 列表 + 用户 + learning 三层

**选择**：
- `app/debug/page.tsx` — 入口，顶栏搜索框
- `app/debug/user/[userId]/page.tsx` — 该用户所有 learning 列表
- `app/debug/learning/[learningId]/page.tsx` — learning 详情（双列泳道）

**搜索框路由逻辑**（前端）：
```ts
function resolveQuery(q: string) {
  const trimmed = q.trim();
  if (UUID_REGEX.test(trimmed)) return { type: "learning", id: trimmed };
  if (EMAIL_REGEX.test(trimmed) || UUID_REGEX.test(trimmed)) return { type: "user", id: trimmed };
  // 兜底：调 searchByQuery 让后端判断
  return { type: "fuzzy", q: trimmed };
}
```
后端 `debug.searchByQuery` 接口兼容三种输入：
- 纯 UUID → 先尝试 `learning.findUnique`，找不到再尝试 user lookup
- email 形式 → 调 supabase admin API 反查 userId
- 其他 → 返回模糊匹配的 learning 候选（按 createdAt desc 取前 20 条；模糊匹配 plan / clarify 的文本片段，next phase 再做）

### Decision 4: 双列泳道用绝对时间对齐

**选择**：左 canvas / 右 chat 两列，按 message.createdAt 全局排序，**用 `position: absolute` + 时间戳计算 top**：
```
top(msg) = (msg.createdAt - earliestCreatedAt) * pxPerSecond
```
- `pxPerSecond` 默认 8，可由 toolbar slider 调（缩放时间轴）
- 同列内消息保留最小垂直间距（卡片高度 + gap），避免极近消息重叠
- 右侧 chat 消息向左画 SVG 连接线指向其 `anchoredCanvasMessageId` 对应的 canvas 卡片

**Alternative**：纯顺序排列（不按真实时间间距）——拒绝，因为时间间隔本身是 debug 信号（"这一段为什么静默 30 秒？"）。

**实现复杂度评估**：约 100 行 React + SVG。可接受。如果实现卡住，回退到顺序排列 + 显式 Δ 标签。

### Decision 5: `parts` JSON 用 `react-json-view-lite`

**选择**：所有 message 的 `parts`、learning 的 `clarify` 用 `react-json-view-lite` 渲染：
- 默认折叠到 1 层
- 长字符串（`text` / `markdown` / `output` 等）单独以 `<pre>` 块展开（react-json-view-lite 对长字符串显示不友好）

**Alternatives 拒掉的**：
- ❌ `react-json-view`：依赖较重、维护活跃度差
- ❌ 自己写：多写不必要的代码
- ❌ 直接 `<pre>{JSON.stringify(parts, null, 2)}</pre>`：没有折叠能力，长 prompt 会刷屏

### Decision 6: 数据查询一次性 fetch，不分页

**选择**：`debug.getLearningDetail({ id })` 一次返回：
```ts
{
  learning: { ...all fields, resources: [...], conceptsCovered: [...] },
  conversations: [
    { id, kind, messages: [...all messages, including soft-deleted] }
  ],
  user: { id, email, app_metadata }  // 来自 supabase
}
```
- 软删除消息后端**始终返回**，前端按 toggle 决定显隐（toggle 切换不重新请求）
- learning 通常 ≤ 100 条 message，单次响应 < 500 KB，不需要分页

**性能保护**：服务端硬上限 500 条 message；超过则截断 + 警告（应该不会触发，但兜底）。

### Decision 7: Trace 入口预留 disabled 按钮

**选择**：每个 message 卡片右上角放 `<button disabled title="Phase 1 接入 Langfuse 后启用">Trace ↗</button>`。Phase 1 接入时只需把 disabled 去掉 + onClick 跳到 Langfuse trace URL。

## Risks / Trade-offs

| Risk | Mitigation |
|------|----------|
| `app_metadata.role` 在客户端 JWT 解析时可见，但**不可篡改**（Supabase 用 service key 签名）；如果某天换认证方案需重新评估 | 文档里明确：admin role 信任来自 Supabase JWT；切换认证时同步评估 |
| 双列时间轴时间间隔过大时垂直空白严重 | 时间轴 zoom slider；超过 5 分钟空白自动折叠成"⋯ 5min ⋯"标记（Phase 0.5 优化） |
| 一次拉 100 条 message 含 prompt 文本，单条 message `parts` 可能含 20k 字符摘要——总响应可能上 MB | 服务端不裁剪，让 react-json-view-lite 折叠管控渲染；如卡顿再加每条 message 的 `parts` lazy load |
| react-json-view-lite 对极长字符串（>10k）渲染慢 | 服务端在每条 message 提取 `parts[*].text/markdown` 长度元数据，前端超过阈值改用 `<pre>` + 折叠按钮 |
| admin 误把 PII 截图外泄 | Phase 0 不做技术防范；运维约束（自我约束 + 仅本人 admin） |

## Migration Plan

1. **DB**：本次无 schema 变更（admin role 走 Supabase metadata，不改 Prisma）
2. **首位 admin 设定**：手动跑一条 SQL 给当前账号设 admin
3. **代码**：context + trpc 增量改动；新增 `app/debug/**` + `server/routers/debug.ts`；新增 `react-json-view-lite` 依赖
4. **回滚**：删除 `app/debug/**` 和 `server/routers/debug.ts`，撤销 context/trpc 改动；admin role 设定的 SQL 可保留（无害）

## Open Questions

- 搜索框模糊匹配（Decision 3 中的 fuzzy 分支）是否 Phase 0 就要实现？倾向**先不做**，纯 UUID/email 已覆盖 90% 场景
- 软删除消息的"已删除"样式是单独颜色还是 opacity？倾向 `opacity-40 + line-through`，简单明显
- 时间轴垂直空白折叠（Risk 中提到）放 Phase 0 还是 Phase 0.5？倾向 0.5，先不做避免实现复杂度爆
