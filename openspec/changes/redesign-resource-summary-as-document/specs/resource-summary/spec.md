## ADDED Requirements

### Requirement: Summary MUST render inside PineSnap main layout

系统 MUST 在 `(main)` route group 下渲染 summary 详情页，使其继承 `MainLayoutWrapper` 提供的左侧边栏导航；MUST NOT 使用全屏 iframe 或独立顶级路由。

#### Scenario: User opens summary keeps sidebar visible

- **WHEN** 用户从 `/sources` 列表点击一张 ResourceCard 进入详情页
- **THEN** 浏览器导航到 `/sources/[resourceId]`
- **AND** 左侧 PineSnap 侧边栏（含 brand、素材/学习/知识 导航、用户菜单）MUST 持续可见
- **AND** 主内容区 MUST 渲染 summary 文档

#### Scenario: Direct link to summary preserves layout

- **WHEN** 用户直接访问 `/sources/[resourceId]` URL（如刷新或外部链接）
- **THEN** 页面 SSR 渲染时 MUST 包含主布局的左侧边栏
- **AND** MUST NOT 出现 `/summary/[id]` 全屏路由的回退

### Requirement: Summary MUST be persisted as structured data

系统 MUST 以 `markdown` 字符串 + `keyMoments` 数组形式存储 summary；MUST NOT 存储或渲染 AI 生成的整页 HTML。每个 resource MUST 至多对应一份 summary（1:1 关系）。

#### Scenario: Schema enforces one summary per resource

- **WHEN** 系统持久化 ResourceSummary 记录
- **THEN** `resourceId` 字段 MUST 是 unique 约束
- **AND** 记录 MUST 包含 `markdown: string` 与 `keyMoments: Array<{label: string, seconds: number}>` 字段
- **AND** 记录 MUST NOT 包含 `html` 字段

#### Scenario: Regenerate replaces previous summary

- **WHEN** 用户对一个已有 summary 的 resource 触发"重新生成"
- **THEN** 系统 MUST 用新生成结果覆盖现有记录（upsert 语义）
- **AND** 系统 MUST NOT 创建新版本记录

### Requirement: AI generation MUST use structured output

系统 MUST 使用 `generateObject` 或等价的结构化输出机制调用 LLM；MUST 用 Zod schema 约束输出格式；MUST NOT 使用 `generateText` 让 AI 自由产生 HTML 或 markdown。

#### Scenario: Generation returns schema-validated object

- **WHEN** 后端调用 LLM 生成 summary
- **THEN** 系统 MUST 传入 Zod schema `{ markdown: string, keyMoments: Array<{label: string, seconds: number}> }`
- **AND** 返回结果 MUST 通过 schema 校验
- **AND** 输出 MUST NOT 包含 markdown code fence（如 ` ```html ` 或 ` ```markdown `）

#### Scenario: Non-video source has empty key moments

- **WHEN** 输入 resource 的 sourceType 为 `web_page` / `wechat_article` / `xiaohongshu` 等非视频源
- **THEN** 生成结果的 `keyMoments` MUST 为空数组
- **AND** 详情页 UI MUST NOT 渲染"关键时刻"小节

### Requirement: Detail page MUST auto-trigger generation when summary missing

系统 MUST 在用户进入 `/sources/[resourceId]` 详情页且无对应 summary 时自动触发生成；MUST NOT 要求用户手动点击"生成"按钮。

#### Scenario: First visit triggers generation automatically

- **WHEN** 用户进入 `/sources/[resourceId]` 且数据库中无对应 ResourceSummary
- **THEN** 主内容区 MUST 渲染 loading skeleton
- **AND** 客户端 MUST 自动调用生成 mutation
- **AND** 生成成功后 MUST 自动展示文档内容（无需用户额外操作）

#### Scenario: Existing summary renders directly without regeneration

- **WHEN** 用户进入 `/sources/[resourceId]` 且数据库中已有对应 ResourceSummary
- **THEN** 系统 MUST 直接渲染该 summary
- **AND** MUST NOT 触发新的 LLM 调用

### Requirement: Source list cards MUST navigate to detail on click

系统 MUST 让 ResourceCard 的整卡单击行为为"导航到 `/sources/[resourceId]` 详情页"；checkbox 区域 MUST 独立处理多选 toggle 不冒泡到整卡。

#### Scenario: Single click opens detail page

- **WHEN** 用户在空选状态下单击一张 ResourceCard 主体（非 checkbox 区域）
- **THEN** 浏览器 MUST 导航到 `/sources/[resourceId]`

#### Scenario: Checkbox click toggles selection only

- **WHEN** 用户点击 ResourceCard 的 checkbox 区域
- **THEN** 系统 MUST 切换该 resource 的选中状态
- **AND** MUST NOT 导航到详情页

#### Scenario: Multi-select mode disables navigation on body click

- **WHEN** 已有任一 resource 处于选中状态
- **AND** 用户单击另一张 ResourceCard 主体
- **THEN** 系统 MUST 切换该卡片的选中状态
- **AND** MUST NOT 导航到详情页

### Requirement: Source list cards MUST show summary preview when available

系统 MUST 在 ResourceCard 上展示 summary 的首句预览（如已生成）；MUST 替换原本展示的 canonicalUrl 行与处理状态行。

#### Scenario: Card shows preview for resource with summary

- **WHEN** ResourceCard 对应的 resource 已存在 ResourceSummary 记录
- **THEN** 卡片 MUST 显示 summary 的预览文本（首句或专门字段）
- **AND** 卡片 MUST NOT 显示 canonicalUrl 行
- **AND** 卡片 MUST 显示一个"已总结"标识

#### Scenario: Card without summary shows generation hint

- **WHEN** ResourceCard 对应的 resource 尚无 ResourceSummary 记录
- **THEN** 卡片 MUST 显示一个提示性文本（如"点击生成总结"或类似引导）
- **AND** 卡片 MUST NOT 渲染空的预览区

### Requirement: Key moments MUST link to source video timestamp

对于视频源 resource（`bilibili` / `youtube` 等），详情页 MUST 把 keyMoments 渲染为可点击列表项，点击后跳转到原视频的对应秒数。

#### Scenario: Bilibili key moment opens video at timestamp

- **WHEN** 用户在 bilibili 视频的 summary 详情页点击一条 keyMoment
- **THEN** 系统 MUST 在新窗口/标签页打开 `https://www.bilibili.com/video/<bvid>?t=<seconds>`
- **AND** 当前 PineSnap 标签页 MUST 保持在 summary 详情页（不被替换）

#### Scenario: Key moments hidden for resources without timestamps

- **WHEN** ResourceSummary 的 `keyMoments` 数组为空
- **THEN** 详情页 MUST NOT 渲染"关键时刻"小节标题或区域

### Requirement: Legacy summary artifact infrastructure MUST be removed

系统 MUST 删除旧的 artifact 子域、签名 token、跨域 iframe 渲染机制；MUST NOT 保留任何能进入"全屏 HTML artifact"体验的入口。

#### Scenario: Old summary route returns 404

- **WHEN** 用户访问 `/summary/[id]` 或 `/summary/[id]/raw`
- **THEN** 服务 MUST 返回 404
- **AND** 仓库中 MUST NOT 存在 `app/summary/` 目录

#### Scenario: No artifact subdomain configuration remains

- **WHEN** 开发者检查代码与配置
- **THEN** MUST NOT 存在 `NEXT_PUBLIC_ARTIFACT_HOST` 相关读取
- **AND** MUST NOT 存在 `signArtifactToken` / `artifact-token.ts` 文件
- **AND** proxy 配置（如 `proxy.ts`）MUST NOT 路由 `artifact.*` 子域
