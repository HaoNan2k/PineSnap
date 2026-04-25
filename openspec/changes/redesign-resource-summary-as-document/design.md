## Context

PineSnap 主布局由 `MainLayoutWrapper`（左侧 w-72 侧边栏 + 主内容区）承载。`(main)` route group 下的 `/sources`、`/learning`、`/notes` 都自动继承该布局。当前 `/summary/[id]` 处于 `app/summary/` 顶层目录，**不**在 `(main)` 下，所以渲染时左侧边栏消失，用户感觉跳出了产品。

现有 summary 实现把 AI 生成的整页 HTML 渲染到一个跨子域 iframe（`artifact.pinesnap.dev` 或本地 `artifact.pinesnap.test`），借助子域 + CSP + 短期签名 token 实现脚本沙盒隔离。这套机制是为了让 AI 自由跑 inline `<script>`、Tailwind Play CDN、anime.js 等而设计的——本次改造把 AI 输出从"可执行 HTML"改成"结构化数据"后，沙盒就成了无意义的额外复杂度。

ResourceSummary 数据模型当前是一对多（一个 resource 可有多个 summary 版本），UI 上以"v1/v2/v3"形式呈现。多版本设计的初衷是 AI 输出方差大、用户需要"抽卡"。结构化输出后这个前提不成立。

注意：`prisma/migrations/20260424100110_add_resource_summary/` 创建了 ResourceSummary 表，但 `prisma/schema.prisma` 中**模型定义缺失**——这是当前仓库的一个不一致状态。本次重构会顺手补回模型定义并彻底重写。

## Goals / Non-Goals

**Goals:**
- Summary 在 PineSnap 主布局内渲染，左侧导航始终可见，"出不去"问题从布局层面消除
- AI 输出从可执行 HTML 改为结构化 JSON（markdown 主体 + keyMoments 数组），杜绝 fence 泄漏和样式失控
- 文档视觉风格遵循 PineSnap 设计系统（serif 标题、`prose` 排版、Tailwind 主题色），与 `/sources` 列表一致
- 路由/数据/UI 三层一起改造，避免在错误方向上继续小修小补
- 列表卡片与详情页之间形成"卡片预览 → 详情阅读"的流畅闭环

**Non-Goals:**
- 不做编辑能力（用户不能手动改 markdown）；纯生成 + 展示
- 不做评论/分享/导出（v1 不需要）
- 不做"AI 智能问答 / 跟随阅读"（已有 `/learning` 流程承接）
- 不做 split view（左网格右文档）；详情页是独立路由
- 不做向后兼容旧 ResourceSummary 数据；现存数据直接丢弃

## Decisions

### 路由设计：嵌入 `(main)` route group

新增 `app/(main)/sources/[resourceId]/page.tsx`，作为 SSR 页面读取 resource + summary 数据。

**为什么不复用 `/summary/[id]`**：URL 语义上"summary id"是技术细节，"resource id"是用户心智的对象（"我点的是这个素材"）。Resource 和 summary 此后是 1:1，没必要让用户感知 summary id 的存在。

**为什么不用 modal/drawer**：浏览器后退、刷新、分享链接、深链都需要真实路由；modal 路由在 Next.js App Router 里也能做（intercepting routes），但和 SSR 数据获取叠加复杂度高，v1 不值得。

**Alternatives considered**：
- `/sources/[id]/summary` 子路径——增加层级且无独立子页面（如 settings）的需要，过度设计
- 保留 `/summary/[id]` 仅迁入 `(main)`——丢失"resource = 用户心智对象"的对齐

### 数据模型：1:1 关系 + 结构化字段

```prisma
model ResourceSummary {
  id            String   @id @default(cuid())
  resourceId    String   @unique  // 1:1
  userId        String
  markdown      String   @db.Text
  keyMoments    Json     // Array<{label: string, seconds: number}>
  model         String
  promptVersion String
  durationMs    Int
  generatedAt   DateTime @default(now())

  resource Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@index([userId, generatedAt])
}
```

**为什么 keyMoments 用 JSONB 而不是单独的表**：
- KeyMoments 永远只在 summary 上下文里读，不会跨 summary 查询
- 数量小（典型 3-10 条），JSON 索引/查询无意义
- 单独建表会增加一次 join 和一组迁移代码

**Alternatives considered**：
- 完全用 markdown 表达 keyMoments（如 `## 关键时刻\n- [02:15] 标题`）——简单但客户端要正则解析，跳转链接生成困难
- JSON blocks 全结构化（连段落都是 block）——前端要写一套渲染层，PR 体积翻倍，v1 不值得

### AI 输出：`generateObject` + Zod schema

用 Vercel AI SDK 的 `generateObject` 替代 `generateText`，传入：

```ts
const SummarySchema = z.object({
  markdown: z.string().describe("正文 markdown，含 ## 概要、## 要点等小节"),
  keyMoments: z.array(z.object({
    label: z.string().describe("这个时刻讲了什么"),
    seconds: z.number().int().nonnegative().describe("视频内秒数"),
  })).describe("视频源才填，文章/网页留空数组"),
});
```

**为什么不留在 generateText**：
- 当前的 ` ```html ` fence 泄漏就是 generateText 的典型失败：模型把"输出 HTML"理解成"输出 markdown 代码块包着的 HTML"
- generateObject 走 tool calling / structured output，从协议层杜绝 fence 问题
- Zod schema 给到 AI 后，文章类素材的 keyMoments 自然为空数组，不需要在 prompt 里反复强调

**Alternatives considered**：
- generateText + 后处理剥 fence——治标不治本，AI 还有别的方式跑偏（前后空行、注释、解释性段落）
- 用 OpenAI structured output 直接走 JSON mode——同 generateObject 但锁死 provider，本项目走的是 Vercel AI SDK 抽象层，保持一致

### Prompt 重写方向

老 prompt 关键词："web 艺术家"、"完整的独立 HTML 页面"、"motion 元素"、"用户驻留探索"——全部删除。

新 prompt 角色定位：**结构化阅读笔记生成器**。要求：
- 标题层级：从 `##` 开始（页面已有 `<h1>`）
- 主体小节建议：`## 概要`（1 段，3-5 句）→ `## 要点`（5-8 个 bullet，每条一句）→ `## 适合谁/什么场景`（视内容可选）
- 中文输出，平实表达
- 字幕里有时间戳信息时，提取 3-7 个 keyMoments；文章/网页 keyMoments 为空数组
- 不输出 "本视频讲了..." 这种 meta 文案，直接讲内容

### 渲染：react-markdown + Tailwind Typography

主体用 `react-markdown` 渲染，套 `prose prose-stone dark:prose-invert max-w-none` class（max-w-none 因为外层容器已 `max-w-3xl`）。

**为什么不用 MDX**：MDX 在 React Server Components 里需要编译时处理或运行时 evaluator，引入依赖重；纯展示场景 react-markdown 够用。

**为什么不自己写渲染器**：项目里已经有类似需求（`/learning` 也展示文本），但写一套自定义渲染器收益小、维护成本高；prose 类已经覆盖 90% 的"Notion 文档感"。

KeyMoments 不通过 markdown，单独用 `<KeyMoments>` 组件渲染（在 markdown 之后），这样：
- 时间戳点击行为是 React 控制，不用 markdown 里塞 HTML
- 视频源/非视频源的判断只在一处

### 列表卡片交互改动

当前 `ResourceCard` 整卡 `onClick = onToggleSelected`，导致用户点完不知道发生了啥。

**改成**：
- 整卡 `<Link href={/sources/${id}}>` —— 单击进详情
- checkbox 区域用 `<button>` 包裹，`stopPropagation` + `preventDefault`，独立处理多选
- 多选状态下整卡仍可点击进详情？**不**——多选模式（selectedCount > 0）下整卡改成 toggle 多选，避免误进详情；空选模式下整卡 = 进详情

这是个常见模式（Gmail / Linear / Notion 列表都这样），用户预期一致。

**Alternatives considered**：
- 拆出"打开"按钮单独点——卡片信息密度低，多一个按钮反而碍事
- 长按进入多选——移动端 OK，桌面端不直观

### 自动生成：详情页打开时的副作用

详情页 SSR 时检查 summary 是否存在：
- 存在：直接渲染
- 不存在：渲染 loading skeleton，客户端 mount 后调 `summary.generate.mutate({ resourceId })`，成功后 invalidate 并重新拉取

**为什么不在 SSR 里直接 await 生成**：30-60 秒的 LLM 调用会阻塞 SSR，浏览器超时；用户也无法看到任何反馈。改 streaming SSR 又把架构搞复杂。客户端触发 + loading skeleton 是最简单的体感最好的方案。

**幂等性**：`generate` mutation 改成 upsert——如果数据库里已有 summary 直接返回，不重新调 LLM。客户端 mount 时如果遇到 race（已有但 query 还没 hydrate），会浪费一次 LLM 调用，可接受。

## Risks / Trade-offs

- **现存 ResourceSummary 数据丢弃** → 功能上线时间不长，影响面小；如果生产已有用户生成数据，部署前确认数据可丢弃，否则需要写转换脚本（HTML → markdown 的转换不可靠，建议直接丢）
- **AI 输出风格变化用户接受度** → 从"花哨 artifact"变成"朴素文档"，可能有用户觉得"变难看了"；缓解：通过 serif 标题 + 视频缩略卡 + key moments 跳转，保持文档自身的"产品感"
- **react-markdown 的 XSS 面** → react-markdown 默认禁用 raw HTML，AI 也不应输出 HTML（schema 约束）；不需要额外的 sanitizer
- **keyMoments 时间戳准确性依赖字幕质量** → 字幕带时间戳才能提；无字幕的视频 keyMoments 为空，UI 上"关键时刻"小节自动隐藏
- **多选模式下整卡点击行为切换** → 用户从"点了进详情"切到"点了 toggle"可能困惑；缓解：多选模式下卡片视觉明显变化（已有 ring-2），且这是行业惯例
- **详情页直接拉取 + 自动触发生成的 race** → 上面已说明，极低概率多花一次 LLM 调用，可接受

## Migration Plan

1. 写 prisma 迁移：drop 旧 ResourceSummary 表（CASCADE）→ 重建带 `markdown` + `keyMoments` 的新表
2. 在本地用 `pnpm prisma migrate dev` 验证（按 CLAUDE.md，先确认 .env.local 指向 dev 数据库，**不要**误打到 prod）
3. 部署顺序：DB 迁移 → 后端 router 重写 → 前端路由 + 详情页 → 删除老 summary 相关文件 + 子域配置
4. 监控：新 summary 生成成功率（目标 >95%），AI 输出 schema 校验失败率（目标 <2%）

**Rollback**：本变更是破坏性的，一旦合并不可回滚到旧 artifact 体验；如果上线后发现严重问题，紧急方案是临时下线"生成总结"按钮（保留路由但不允许新生成），同时调研问题。

## Open Questions

- **新依赖审批**：`react-markdown` + `@tailwindcss/typography` 两个包，是否需要走依赖审计流程？（项目目前看起来没有此类流程，默认按需引入）
- **总结预览首句来源**：在 ResourceCard 上展示总结预览时，是从 markdown 提取首段（去掉 heading），还是 prompt 里专门让 AI 输出一个 `oneLineSummary` 字段？倾向后者——更稳定、不需要客户端再做 markdown 解析
- **B 站时间戳跳转方式**：v1 用"在新窗口打开 `https://www.bilibili.com/video/{bvid}?t={sec}`"还是"内嵌 player iframe + postMessage 跳转"？倾向新窗口——简单、可靠、不需处理 iframe 通信；后续如果想做"在文档内播放"再迭代
