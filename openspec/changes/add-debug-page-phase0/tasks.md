## 1. Admin role 基础设施

- [ ] 1.1 跑 SQL 把当前账号 `manjurpontjo@hotmail.com` 在 Supabase 的 `auth.users.raw_app_meta_data` 设为 `{"role":"admin"}`，确认 `supabase.auth.getUser()` 返回的 `user.app_metadata.role === "admin"`
- [x] 1.2 改 `server/context.ts`：导出 `UserRole` + `resolveUserRole(supabase)`，按需读 `app_metadata.role`，避免破坏 header fast-path
- [x] 1.3 改 `server/trpc.ts`：新增 `adminProcedure = protectedProcedure.use(...)`，role !== "admin" 抛 `FORBIDDEN`；导出供 router 使用
- [x] 1.4 写 `docs/platform/admin-role-setup.md`，记录设 admin 的 SQL 与运维流程

## 2. Debug tRPC router

- [x] 2.1 新建 `server/routers/debug.ts`，定义 `searchByQuery` / `getLearningDetail` / `listLearningsByUser` 三个 procedure，全部用 `adminProcedure`
- [x] 2.2 `searchByQuery({ q: string })`：识别 UUID → 查 `learning.findUnique` 返回 `{ type: "learning", id }`；识别 email → 用 supabase admin client 反查 user 返回 `{ type: "user", id }`；其他返回 `{ type: "none" }`
- [x] 2.3 `getLearningDetail({ id })`：返回 `{ learning, user, truncated, messageCap }`，conversations 嵌套在 learning 里包含 canvas + chat 两条，每条带其全部 messages（含软删除）；上限 500 条 message，超过截断并标 `truncated: true`
- [x] 2.4 `listLearningsByUser({ userId })`：返回该用户所有 learning（含软删除），按 createdAt desc 排序，每条含 id / createdAt / messageCount / hasPlan
- [x] 2.5 在 `server/index.ts` 注册 `debug` namespace
- [ ] 2.6 手动用 admin 账号在 tRPC playground / 浏览器里调三个 procedure，确认数据正确；用普通账号确认拿到 FORBIDDEN

## 3. 路由结构与 Admin 守卫

- [x] 3.1 新建 `app/debug/layout.tsx`：服务端检查 admin role，否则渲染 403 页面；未登录跳 `/login?returnUrl=/debug`
- [x] 3.2 新建 `app/debug/page.tsx`：入口指引页（搜索框由 layout 头提供）
- [x] 3.3 新建 `app/debug/learning/[learningId]/page.tsx`：调 `debug.getLearningDetail`
- [x] 3.4 新建 `app/debug/user/[userId]/page.tsx`：调 `debug.listLearningsByUser`
- [x] 3.5 加路由 `error.tsx` / `not-found.tsx`，错误 fallback 显示原始 error message + stack

## 4. 搜索框组件

- [x] 4.1 新建 `components/debug/search-bar.tsx`：受控 input + Enter 触发；前端先用 regex 判 UUID 直接 router.push，邮箱兜底调 `searchByQuery`
- [x] 4.2 layout 顶栏全局挂搜索框（所有 /debug/* 页面可见）
- [x] 4.3 空查询/无结果显示 "未找到匹配项（按 X 解析）"

## 5. Learning 详情页 — 元信息卡

- [x] 5.1 新建 `components/debug/learning-meta-card.tsx`：渲染 learning 全部元数据（id 可复制、user email 可复制、时间戳、resources 列表、conversations 概览）
- [x] 5.2 安装 `react-json-view-lite`；写薄包装 `components/debug/json-block.tsx`：折叠级别可配
- [x] 5.3 元信息卡里 `clarify` 用 `<JsonBlock>`、`plan` 用 `<MarkdownRenderer>`（复用 `components/ui/markdown-renderer.tsx`）

## 6. 双列泳道时间轴

- [x] 6.1 新建 `components/debug/timeline-canvas.tsx`：合并 canvas + chat messages，按 createdAt 升序得到 `earliestMs`
- [x] 6.2 实现 `topPx(msg) = (msg.createdAt - earliestMs) / 1000 * pxPerSecond`；默认 `pxPerSecond = 8`，toolbar 提供 select（4 / 8 / 16 / 32 / 64）
- [x] 6.3 左右两列各 absolute 定位卡片；同列内若两卡片重叠（top < lastBottom + MIN_GAP）则下沉到 lastBottom + MIN_GAP
- [x] 6.4 SVG 层覆盖整个时间轴，用 useLayoutEffect + ResizeObserver 测真实卡片中心点，画 chat → canvas 的虚线贝塞尔连接线
- [x] 6.5 顶部 toolbar 含：zoom select、"显示已删除" checkbox、earliest 时间显示

## 7. Message 卡片组件

- [x] 7.1 新建 `components/debug/message-card.tsx`：接收 `DebugMessage` 渲染完整字段
- [x] 7.2 Header 行：role badge（颜色区分 user/assistant/tool/system）、id Copyable、conversation kind 标签、createdAt 绝对时间、`Δ +N.Ns` 相对前一条同列耗时
- [x] 7.3 Metadata 行：clientMessageId、anchoredCanvasMessageId、deletedAt 都可复制
- [x] 7.4 Body：`parts` 通过 `<JsonBlock collapseLevel={1}>` 渲染
- [x] 7.5 右上角：disabled `<button>Trace ↗</button>` + title 提示
- [x] 7.6 软删除消息：`opacity-40 line-through`，但内容仍可读

## 8. User learning 列表页

- [x] 8.1 新建 `components/debug/learning-list.tsx`：表格（columns: learningId Copyable + open 链接、createdAt、updatedAt、messageCount、hasPlan、deletedAt）
- [x] 8.2 数据已按 createdAt desc 排序（debug router 端做）；行内 open 链接到 `/debug/learning/[id]`

## 9. 验证 & 收尾

- [ ] 9.1 admin 账号登录后跑通：搜邮箱 → 看列表 → 进 learning → 看双列时间轴 + 卡片 + JSON 折叠 + 软删除 toggle 切换
- [ ] 9.2 普通账号登录访问 `/debug` → 拿到 403；直接 fetch tRPC `debug.*` → 拿到 FORBIDDEN
- [ ] 9.3 未登录访问 `/debug` → 跳登录
- [ ] 9.4 对一条至少有 1 条 chat message + anchor 的 learning，确认 SVG 连接线指向正确 canvas 卡片
- [ ] 9.5 验证软删除消息默认隐藏、toggle 打开后正常显示且 Δ 重算正确
- [ ] 9.6 验证一个超过 500 条 message 的 learning（构造测试数据）能截断且前端有警告 —— 若不易构造则跳过，靠人工 review
