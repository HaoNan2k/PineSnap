## 1. 数据库与 schema

- [x] 1.1 在 `prisma/schema.prisma` 中添加新的 `ResourceSummary` 模型（`resourceId` unique，含 `markdown` Text 字段、`keyMoments` Json 字段、`oneLineSummary` String 字段、保留 `model` / `promptVersion` / `durationMs` / `generatedAt`）
- [x] 1.2 在 `Resource` 模型上加反向关系字段 `summary ResourceSummary?`
- [ ] 1.3 确认 `.env.local` 指向 dev 数据库（按 CLAUDE.md feedback_prisma_migrate_target）— **用户操作**
- [ ] 1.4 用 `pnpm prisma migrate dev --name redesign_resource_summary` 生成迁移；迁移应 drop 旧 ResourceSummary 表 + 重建新结构 — **用户操作**
- [x] 1.5 在 `docs/platform/database-data-dictionary.md` 更新 ResourceSummary 字段定义

## 2. 后端：生成与 router

- [x] 2.1 新建 `lib/summary/schema.ts`，定义 Zod schema：`{ markdown: string, oneLineSummary: string, keyMoments: Array<{label: string, seconds: number}> }`
- [x] 2.2 重写 `lib/summary/prompt.ts`：新角色"结构化阅读笔记生成器"，删掉 web 艺术家 / motion / artifact 相关内容；约束输出小节结构（## 概要 / ## 要点 / 可选 ## 适合谁）；视频带字幕时间戳才提 keyMoments
- [x] 2.3 重写 `lib/summary/generate.ts`：用 `generateObject` + Zod schema 调用 LLM；返回 `{ markdown, oneLineSummary, keyMoments, durationMs, modelId, promptVersion }`
- [x] 2.4 删除 `lib/summary/validate.ts`、`lib/summary/artifact-token.ts`（结构化输出后不需要）
- [x] 2.5 重写 `server/routers/summary.ts`：仅保留 `getByResourceId`（查询）和 `generate`（upsert mutation）；删除 `list` / `listByResource`；`generate` 入参改为 `{ resourceId }`，鉴权确认 resource 归属当前用户。**额外**：在 `server/index.ts` 注册 `summary` router（v1 没注册过，旧客户端实际跑不通）
- [x] 2.6 `generate` mutation 实现 upsert 语义：DB 已有则覆盖（包括 markdown / oneLineSummary / keyMoments / 元信息），无则新建

## 3. 详情页路由

- [x] 3.1 新建 `app/(main)/sources/[resourceId]/page.tsx`：SSR 鉴权 + 读取 resource + 读取 summary（如有）
- [x] 3.2 详情页骨架：面包屑（← 素材，文本 link 回 `/sources`）+ 来源标签 + 日期 + serif 大标题 + 视频缩略卡（视频源才渲染）
- [x] 3.3 处理 resource 不存在或不属于当前用户的情况（`notFound()`）
- [x] 3.4 客户端 mount 逻辑：query 命中 summary 则渲染；未命中则触发 `generate.mutate({ resourceId })`，期间显示 loading skeleton

## 4. 文档渲染组件

- [x] 4.1 安装新依赖：`pnpm add react-markdown @tailwindcss/typography` — **已存在于 package.json**
- [x] 4.2 在 `tailwind.config.ts`（或对应配置文件）启用 typography plugin — Tailwind v4 用 CSS 配置：`@plugin "@tailwindcss/typography"` 加到 `app/globals.css`
- [x] 4.3 新建 `components/summary/summary-document.tsx`：主体用 `react-markdown` + `prose prose-stone dark:prose-invert max-w-none` class 渲染 markdown
- [x] 4.4 新建 `components/summary/key-moments.tsx`：接收 `keyMoments` + `sourceType` + `canonicalUrl`；空数组则返回 null；非空时渲染"关键时刻"小节，每条 `mm:ss + label`，点击在新窗口打开原视频对应秒数
- [x] 4.5 KeyMoments 时间戳跳转：bilibili 拼接 `https://www.bilibili.com/video/{bvid}?t={sec}`（从 canonicalUrl 提取 BV ID）；其他视频源后续再加，v1 只支持 bilibili
- [x] 4.6 详情页底部"重新生成"按钮：调用 `generate.mutate`，loading 期间禁用、显示进度文案

## 5. 列表卡片改造

- [x] 5.1 修改 `components/sources/source-list.tsx`：在 `resource.list` query 数据中带上 `summary { oneLineSummary }`（需后端 router 配合返回）— 在 `lib/db/resource.ts:getUserResources` 加 `summary: { select: { oneLineSummary: true } }`
- [x] 5.2 ResourceCard 整卡改成 `<Link href="/sources/${id}">`；checkbox 区域用单独的 button + `stopPropagation()` + `preventDefault()` 处理多选
- [x] 5.3 多选模式（`selectedCount > 0`）下整卡仍 toggle 多选不导航（外层根据 selectedCount 切换 `<Link>` 与 `<button>`）
- [x] 5.4 卡片信息行：有 summary 时显示 `oneLineSummary`（line-clamp-2）+ "✓ 已总结"标识；无 summary 时显示提示文案"点击生成总结"
- [x] 5.5 删除卡片上的 canonicalUrl 行和 `getStatusLabel(activeJob.status)` 行（或仅在没有 summary 时降级显示状态）

## 6. 删除老实现

- [x] 6.1 删除目录 `app/summary/`
- [x] 6.2 删除 `components/summary/artifact-fab.tsx`
- [x] 6.3 删除 `components/sources/summary-drawer.tsx`，并在 `source-list.tsx` 中移除其引用与"探索版"入口（如有）— `source-list.tsx` 中无 SummaryDrawer 引用
- [x] 6.4 检查 `proxy.ts`，移除 `artifact.*` 子域路由相关逻辑 — proxy.ts 中无 artifact 相关代码
- [x] 6.5 全仓搜 `NEXT_PUBLIC_ARTIFACT_HOST` / `signArtifactToken` / `verifyArtifactToken` 引用，全部清理 — 已删除全部源文件与测试
- [ ] 6.6 `.env.example` / `.env.local`（如有）中移除 artifact 子域相关变量 — **用户操作**：worktree 用了 symlink，主 worktree 的 `.env.local` 若有 `NEXT_PUBLIC_ARTIFACT_HOST` / `ARTIFACT_TOKEN_SECRET` 自行清理

## 7. tRPC 类型与查询联动

- [x] 7.1 修改 `resource.list` 返回值，包含 `summary: { oneLineSummary } | null`
- [x] 7.2 客户端 invalidate：`generate` 成功后 invalidate `summary.getByResourceId` 和 `resource.list`，让列表卡片预览同步更新

## 8. 验证与测试

- [x] 8.1 typecheck 通过：`pnpm tsc --noEmit`
- [x] 8.2 lint 通过：`pnpm eslint .` — 改动文件 0 错误（仓库其它脚本中预存在的 lint 错误未触碰）
- [x] 8.3 单元测试：为 `lib/summary/prompt.ts`（新 prompt 不含禁用词）和 `lib/summary/schema.ts`（Zod schema 边界）补 vitest 用例 — 15 用例全过
- [ ] 8.4 手动验证：在 dev 环境 push 一个 bilibili 视频 → 进 `/sources` → 点卡片 → 详情页 loading → 自动出 summary → keyMoments 点击在新窗口正确跳秒 — **用户操作**
- [ ] 8.5 手动验证：网页类素材（web_page）keyMoments 为空时，详情页不渲染"关键时刻"小节 — **用户操作**
- [ ] 8.6 手动验证：列表 checkbox 多选 + "创建学习"流程仍然可用 — **用户操作**
- [ ] 8.7 手动验证：访问已删除的 `/summary/[id]` 旧路径返回 404 — **用户操作**

## 9. 文档与协作飞轮

- [x] 9.1 更新 `docs/platform/database-data-dictionary.md` 中 ResourceSummary 条目 — 已在 1.5 完成
- [ ] 9.2 评估是否需要新建一篇 docs/learning/ 或 docs/decisions/ 沉淀文档（按 sediment-doc skill 触发清单）— 由用户决定
- [ ] 9.3 撰写中文用户测试步骤交给用户验收 — 见对话末尾测试步骤
