## Why

当前 Resource Summary 把 AI 生成的整页 HTML 用跨子域 iframe 全屏渲染，体验上和 PineSnap 整体产品脱节：用户感觉"跳出了产品"、AI 味重（暗色 grid 背景 / 紫色渐变 / 自定义动效）、`` ```html `` markdown fence 还会泄漏到页面左上角。核心问题是产品定位错了——summary 应该是 PineSnap 内部的一篇结构化文档，不是 AI 放飞的 artifact。

## What Changes

- **BREAKING**: 删除 `/summary/[id]` 全屏路由 + `app/summary/[id]/raw` artifact 子域 + 签名 token 整套机制
- **BREAKING**: 删除 `ResourceSummary.html` 字段和多版本模型；改为 `resourceId` unique，`markdown` + `keyMoments` 结构化字段；现存数据丢弃（功能上线时间不长）
- **BREAKING**: 列表卡片单击行为从"toggle 多选"改为"进入详情页"；多选改由 checkbox 区域独立处理
- 新增 `/sources/[resourceId]` 详情页，继承 `MainLayoutWrapper` 主布局（左侧导航始终可见）
- 详情页布局：面包屑（← 素材 · 来源 · 日期）+ serif 标题 + 视频缩略卡 + Markdown 主体 + KeyMoments 列表 + 底部"重新生成"按钮
- 进入详情页时若无 summary，自动触发生成（loading 占据主区域），不再让用户手动点按钮
- ResourceCard 新增"总结首句"预览，替换原本的 url 和处理状态行
- 重写生成 pipeline：prompt 改为结构化阅读笔记，使用 `generateObject` + Zod schema 替代 `generateText`，从源头杜绝 markdown fence 泄漏
- 视频源（B 站等）的 keyMoments 含时间戳，点击在新窗口打开原视频对应秒数；非视频源 keyMoments 为空数组
- tRPC `summary` router 重写：仅保留 `getByResourceId` + `generate`（upsert 语义），删除 `list` / `listByResource`
- 新增依赖：`react-markdown` + `@tailwindcss/typography`

## Capabilities

### New Capabilities

- `resource-summary`: 将素材生成结构化阅读文档（markdown 主体 + keyMoments 列表），在 PineSnap 主布局内的素材详情页展示

### Modified Capabilities

无。`content-capture` 只负责采集，不涉及总结；`ui-design` 是设计系统约束，本变更遵循其规范但不修改其要求。

## Impact

**待删文件**：
- `app/summary/` 整个目录（包括 `[id]/page.tsx` 和 `[id]/raw/route.ts`）
- `components/summary/artifact-fab.tsx`
- `components/sources/summary-drawer.tsx`
- `lib/summary/artifact-token.ts`
- `lib/summary/validate.ts`（结构化输出后不需要）

**待改文件**：
- `prisma/schema.prisma` — 加 `ResourceSummary` 模型（注：当前迁移已建表但 schema 中模型缺失，本次顺手补回并重写）
- `prisma/migrations/` — 新增迁移：drop 旧表 → 重建新结构
- `lib/summary/prompt.ts` — 完全重写
- `lib/summary/generate.ts` — 改用 `generateObject` + Zod schema
- `server/routers/summary.ts` — 重写 router
- `components/sources/source-list.tsx` — 改卡片交互 + 加总结预览
- `app/(main)/sources/page.tsx` — 不动（路由层面通过新增 `[resourceId]/page.tsx` 实现）

**新增文件**：
- `app/(main)/sources/[resourceId]/page.tsx` — 详情页（SSR）
- `components/summary/summary-document.tsx` — 文档渲染主组件
- `components/summary/key-moments.tsx` — KeyMoments 时间戳跳转组件
- `lib/summary/schema.ts` — Zod schema for structured output

**外部依赖**：
- 新增 `react-markdown` + `@tailwindcss/typography`（需在 `tailwind.config.ts` 启用 plugin）

**数据库**：
- 破坏性 schema 变更；需写迁移 SQL（drop + recreate）；现存 ResourceSummary 数据丢弃

**文档同步**（按 CLAUDE.md 要求）：
- `docs/platform/database-data-dictionary.md` 更新 ResourceSummary 字段定义
