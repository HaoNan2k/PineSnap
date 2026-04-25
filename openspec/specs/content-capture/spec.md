# content-capture Specification

## Purpose

本规范定义跨来源内容采集的当前真相约束。系统以 `CaptureContext` + `CaptureJob` + `CaptureArtifact` 为核心模型，统一通过 `POST /api/capture/jobs` 入库。
## Requirements
### Requirement: Capture requests MUST be authenticated by server-controlled tokens

系统 MUST 使用服务端签发的 `CaptureToken` 做鉴权，并按来源 scope 校验权限。

#### Scenario: Scoped extension token is accepted for capture jobs

- **WHEN** 扩展携带包含对应 `capture:<sourceType>` scope 的 Bearer token 请求 `POST /api/capture/jobs`
- **THEN** 服务端 MUST 通过鉴权并继续执行 body 校验与入库流程

### Requirement: Capture ingestion MUST use unified jobs endpoint only

系统 MUST 仅保留 `POST /api/capture/jobs` 作为采集入口，不允许保留历史兼容 API。

#### Scenario: Unified endpoint is the only capture ingress

- **WHEN** 开发者检查当前采集 API
- **THEN** 采集入口 MUST 仅为 `POST /api/capture/jobs`
- **AND** 系统 MUST NOT 依赖任何历史兼容采集入口

### Requirement: Capture MUST persist Resource and Job atomically with idempotency

系统 MUST 在同一幂等流程中处理 `Resource` 与 `CaptureJob` 的创建，避免并发下出现孤儿数据。

系统 MUST 使用 `CaptureJob(resourceId, captureRequestId)` 作为任务去重键。

#### Scenario: Duplicate capture request returns existing job under same resource

- **GIVEN** 同一 `resourceId` 下重复提交相同 `captureRequestId`
- **WHEN** 请求到达 `POST /api/capture/jobs`
- **THEN** 服务端 MUST 命中同一条已存在 `CaptureJob`
- **AND** 服务端 MUST 返回已有 `resourceId` 与 `jobId`

### Requirement: Capture MUST NOT create conversations implicitly

采集流程 MUST 与聊天流程解耦，采集请求不应隐式创建 `Conversation/Message`。

#### Scenario: No conversation created during capture

- **WHEN** 服务端处理 `POST /api/capture/jobs`
- **THEN** 服务端 MUST NOT 创建 `Conversation` 或 `Message`

### Requirement: Capture endpoints MUST restrict CORS by allowlist

采集相关路由 MUST 使用 allowlist 限制可用 Origin。

#### Scenario: Non-allowlisted origin is rejected by CORS policy

- **WHEN** 请求 `Origin` 不在 allowlist 中
- **THEN** 响应 MUST NOT 返回允许该 Origin 的 CORS 头

### Requirement: Extension authorization SHALL support one-time code exchange

系统 SHALL 提供授权码握手：用户确认授权后签发一次性 code，扩展再兑换 `CaptureToken`。

#### Scenario: Authorized extension receives scoped token

- **GIVEN** 用户已登录并完成扩展授权
- **WHEN** 扩展使用有效 `code` 与 `codeVerifier` 调用 exchange
- **THEN** 服务端 MUST 返回可用于 `POST /api/capture/jobs` 的 token
- **AND** 该 token MUST 至少包含一个 `capture:*` 范围内 scope

#### Scenario: Invalid or consumed code is rejected

- **WHEN** 扩展使用过期或已消费 code 进行 exchange
- **THEN** 服务端 MUST 拒绝请求并返回明确失败语义

### Requirement: Capture job stages MUST use normal operational values only

`CaptureJob.stage` MUST 仅表示运行态语义，不允许保留历史迁移专用阶段值。

#### Scenario: Job stage excludes historical migration state

- **WHEN** 系统定义或写入 `CaptureJob.stage`
- **THEN** 阶段值 MUST 仅来自运行期状态集合（如 `QUEUED/CLAIMED/COMPLETED/FAILED/CANCELLED`）
- **AND** 系统 MUST NOT 使用导入专用阶段值（例如 `IMPORTED`）

### Requirement: CaptureArtifact content MUST be the single source of consumable capture content

系统 MUST 将可消费正文（字幕、摘要、抽取文本等）统一持久化在 `CaptureArtifact.content`，并将其作为唯一内容真相源。

#### Scenario: Learning reads artifact content first

- **WHEN** learning 流程装配资源内容上下文
- **THEN** 系统 MUST 优先读取 primary `CaptureArtifact.content`
- **AND** 系统 MUST NOT 将 `Resource` 的对象字段作为正文真相源

### Requirement: Resource metadata MUST be lightweight object-level snapshot only

系统 MUST 将 `Resource` 的 JSON 字段语义限定为轻量对象摘要（如展示元数据），不得承载完整采集正文。

#### Scenario: Resource stores object metadata rather than full transcript

- **WHEN** 系统创建或更新 `Resource`
- **THEN** JSON 字段 SHALL 仅存放对象级摘要/展示信息
- **AND** 完整采集正文 MUST 写入 `CaptureArtifact.content`

### Requirement: Resource MUST use minimal listing fields

系统 MUST 使用简化的资源字段集合服务列表展示与跳转：`sourceType`、`title`、`canonicalUrl`、`thumbnailUrl`、`metadata`。

#### Scenario: Resource list card is built from minimal fields

- **WHEN** 客户端渲染 Resource 列表
- **THEN** 系统 MUST 依赖 `sourceType/title/canonicalUrl/thumbnailUrl` 提供卡片主信息
- **AND** 平台扩展展示信息 MAY 存放在 `metadata`

### Requirement: Capture relations MUST avoid redundant derivable fields

系统 MUST 删除可由关系推导的冗余字段，降低一致性风险。

#### Scenario: Artifact derives resource via job relation

- **WHEN** 系统读取某条 `CaptureArtifact`
- **THEN** 资源归属 MUST 通过 `jobId -> CaptureJob.resourceId` 推导
- **AND** 系统 MUST NOT 依赖 `CaptureArtifact.resourceId` 冗余列

#### Scenario: Job derives owner via resource relation

- **WHEN** 系统读取某条 `CaptureJob`
- **THEN** 用户归属 MUST 通过 `resourceId -> Resource.userId` 推导
- **AND** 系统 MUST NOT 依赖 `CaptureJob.userId` 冗余列

### Requirement: Supersede lineage MUST be referentially consistent

系统 MUST 为 `CaptureJob.supersededByJobId` 建立数据库级自关联约束，避免悬挂引用。

#### Scenario: Superseded job always points to existing replacement job

- **WHEN** 某个 job 被标记为 superseded
- **THEN** `supersededByJobId` MUST 引用一条存在的 `CaptureJob.id`
- **AND** 数据库 MUST 拒绝写入不存在 replacement 的引用

### Requirement: Capture extension MUST route by URL to site-specific extractor with generic fallback

扩展 MUST 在 content script 中按当前页面 URL 路由到对应的 extractor，未命中任何站点适配器时 MUST 回退到通用文章抽取器。

扩展 MUST 使用单一 `<all_urls>` 注入策略（`content_scripts.matches: ["<all_urls>"]`），路由决策 MUST 在运行期完成。

路由由 `shared/extractor-registry.js` 的 `SITE_ADAPTERS` 正则数组驱动，失配时 MUST 落到 `generic_article_v1` extractor。

#### Scenario: Site-specific adapter is selected when URL matches

- **GIVEN** 用户当前在 `https://www.bilibili.com/video/BV...` 页面
- **WHEN** 扩展初始化并准备采集
- **THEN** 扩展 MUST 选择 `bilibili_full_subtitle_v1` extractor
- **AND** 扩展 MUST NOT 运行 generic article extractor

#### Scenario: Generic extractor handles unknown domain

- **GIVEN** 用户当前在任意未被定制适配的博客页
- **WHEN** 扩展初始化并准备采集
- **THEN** 扩展 MUST 回退到 `generic_article_v1` extractor
- **AND** extractor MUST 使用 Defuddle 从已渲染 DOM 抽取文章型正文

### Requirement: Article-type captures MUST emit CaptureArtifact with extracted_text + markdown shape

扩展针对文章型内容（博客、公众号、知乎、文档等）MUST 以 `CaptureArtifact.kind = "extracted_text"` + `format = "markdown"` 写入正文产物（复用现有 `CaptureArtifactKind` / `CaptureArtifactFormat` 枚举，不新增枚举值）。

文章型主产物 `content` 结构 MUST 满足：

- `markdown`：清洁正文（主字段，必填）
- `title`：文章标题（必填）
- `author`：作者（可选）
- `publishedAt`：发布时间 ISO 8601 字符串（可选）
- `cover`：封面 URL（可选）
- `sourceHtml`：原始页面 HTML 快照，可选，用于未来重抽（大小上限 500KB，超出截断并标注）
- `wordCount`：字数（可选）
- `metadata.captureDiagnostics`：抽取器 provider id、版本、用时、命中/未命中细节

#### Scenario: Article capture persists markdown under existing enum values

- **WHEN** 采集流程完成文章型抽取
- **THEN** 系统 MUST 写入 `CaptureArtifact.kind = "extracted_text"` 且 `format = "markdown"` 且 `isPrimary = true`
- **AND** `content.markdown` MUST 非空
- **AND** `content.title` MUST 非空
- **AND** 系统 MUST NOT 新增 `article_markdown` 等枚举值

#### Scenario: Learning consumers read article markdown from artifact content

- **WHEN** learning 装配文章型资源内容上下文
- **THEN** 系统 MUST 从 primary `extracted_text` 产物的 `content.markdown` 读取正文
- **AND** 系统 MUST NOT 从 `Resource` 对象字段读取文章正文

### Requirement: web_extract jobType MUST be the sole jobType for article-type captures

系统 MUST 使用 `web_extract` 作为所有文章型抽取任务的唯一 jobType，删除 `article_extract` 枚举值。

`inferJobTypeFromSource` MUST 在所有非视频 sourceType（含历史 wechat_article / xiaohongshu）下返回 `web_extract`。

Migration MUST 先 UPDATE 任何 `CaptureJob.jobType = 'article_extract'` 的存量记录为 `web_extract`，再从 `CaptureJobType` 枚举中移除 `article_extract`。

#### Scenario: Article extract jobs use web_extract jobType

- **WHEN** 服务端按 sourceType 推断 jobType（wechat_article、zhihu、通用博客等文章型来源）
- **THEN** 推断结果 MUST 为 `web_extract`
- **AND** 系统 MUST NOT 使用 `article_extract`

#### Scenario: Migration removes article_extract after data update

- **GIVEN** 一次 prisma migration 目标删除 `article_extract` 枚举值
- **WHEN** migration 执行
- **THEN** migration MUST 先 UPDATE 所有 `CaptureJob.jobType = 'article_extract'` 行为 `web_extract`
- **AND** 之后 MUST 从枚举中移除该值
- **AND** migration 的 down 路径 MUST 能恢复枚举值（但不要求回填历史 job）

### Requirement: Non-video sources MUST consolidate to web_page sourceType

系统 MUST 合并 `wechat_article` / `xiaohongshu` 到 `web_page` sourceType，站点区分 MUST 改由 `providerContext.webPage.extractor` 字段承载。

`providerContext.webPage.extractor` MUST 是 zod enum，取值 MUST 对应 extractor registry 中注册的 provider id（例如 `generic_article_v1`、`wechat_article_v1`、`zhihu_answer_v1`）。

Migration MUST 在合并前：
- UPDATE 存量 Resource / Job 的 `sourceType` 从 `wechat_article` / `xiaohongshu` 为 `web_page`
- 回填 `Resource.sourceFingerprint`（重新计算为 `web_page:<canonicalUrl>` 的 sha256），避免未来采集重复入库
- 回填 `CaptureJob.inputContext.providerContext.webPage.extractor` 字段

#### Scenario: New wechat capture uses web_page sourceType

- **WHEN** 扩展采集公众号文章并构造 CaptureContext
- **THEN** `sourceType` MUST 为 `web_page`
- **AND** `providerContext.webPage.extractor` MUST 为 `wechat_article_v1`
- **AND** 系统 MUST NOT 设置 `sourceType = wechat_article`

#### Scenario: sourceFingerprint stays stable across migration

- **GIVEN** 一个存量 Resource 原本 `sourceType = wechat_article`，`sourceFingerprint = sha256("wechat_article:<canonicalUrl>")`
- **WHEN** 合并 migration 执行
- **THEN** 该 Resource 的 `sourceType` MUST 更新为 `web_page`
- **AND** `sourceFingerprint` MUST 重新计算为 `sha256("web_page:<canonicalUrl>")`
- **AND** 后续扩展再次采集同一 URL 时 MUST 命中同一 Resource（去重生效）

### Requirement: Capture token scopes MUST remain valid across sourceType consolidation

系统 MUST 在 sourceType 合并后，保证持有 `capture:wechat_article` / `capture:xiaohongshu` scope 的存量 token 仍能通过授权（视为包含 `capture:web_page`），或 MUST 在授权握手处清晰提示用户重新授权。

#### Scenario: Legacy token with wechat_article scope is accepted for web_page capture

- **GIVEN** 一个 CaptureToken 包含 `capture:wechat_article` scope
- **WHEN** 扩展以 `sourceType = web_page` + `providerContext.webPage.extractor = wechat_article_v1` 请求采集
- **THEN** 服务端 MUST 视 `capture:wechat_article` 为等价于 `capture:web_page`，通过 scope 校验

### Requirement: Worker MUST dispatch jobs by jobType via handler map

`worker/main.ts` MUST 按 `jobType` 通过 handler map 分发作业，不得硬编码单一 jobType 过滤器。

未注册 handler 的 jobType MUST 标记 `FAILED` + `errorCode = "UNSUPPORTED_JOB_TYPE"`。本次变更 MUST NOT 实现 `web_extract` 的服务端 Defuddle 抓取逻辑（无调用方），保留为后续变更。

#### Scenario: audio_transcribe jobs continue to process

- **GIVEN** 一个 `jobType = audio_transcribe` 的作业进入队列
- **WHEN** worker 轮询
- **THEN** worker MUST 认领并按现有行为处理
- **AND** 处理结果 MUST 与重构前一致

#### Scenario: web_extract jobs without handler return structured failure

- **GIVEN** 一个 `jobType = web_extract` 的作业进入队列（因本 PR 不实现，理论上不应有此类作业进入队列，但出于健壮性）
- **WHEN** worker 发现未注册此 jobType 的 handler
- **THEN** worker MUST 标记该作业为 `FAILED`
- **AND** `errorCode` MUST 为 `UNSUPPORTED_JOB_TYPE`

### Requirement: Extractor output contracts MUST be layered by content shape

系统 MUST 在扩展 extractor 层按内容形态分层输出契约，不得用单一 schema 覆盖多种形态：

- **文章型**（博客 / 公众号 / 知乎 / 文档 / 新闻）MUST 输出 `{ kind: "extracted_text", format: "markdown", content: {markdown, title, ...} }`
- **视频型**（B 站 / YouTube）MUST 输出 `{ kind: "official_subtitle" | "asr_transcript", format: "cue_lines", content: {transcript, summary} }`

extractor-registry MUST 只承担路由与错误聚合职责，payload 组装 MUST 由各 extractor 自身完成。

#### Scenario: Registry delegates payload construction to extractor

- **WHEN** registry 路由到某个 extractor 并成功执行
- **THEN** registry MUST 直接返回该 extractor 输出的 payload
- **AND** registry MUST NOT 重新包装、改写或覆盖 extractor 的 `content` 字段

#### Scenario: content.js dispatches upload payload by artifact kind

- **WHEN** content.js 收到 extractor 返回的 payload
- **THEN** content.js MUST 按 `payload.artifact.kind` 分派组装最终 `POST /api/capture/jobs` 请求体
- **AND** article / video 两种形态 MUST 各自走互不影响的字段映射

### Requirement: Error codes and fallback classification MUST be centralized

扩展 MUST 把跨 extractor 的错误码常量与 `isFallbackable(code)` 分类函数集中在 `shared/extractor-registry.js` 导出，content.js 的终态 / fallback 判断 MUST 只调用此导出，不得散落在各 extractor 文件。

#### Scenario: content.js uses centralized fallback classifier

- **WHEN** content.js 收到 extractor 失败结果
- **THEN** content.js MUST 调用 `isFallbackable(code)` 判断是否触发 ASR fallback 或降级提示
- **AND** content.js MUST NOT 内联 extractor 专属错误码的 switch 分支

### Requirement: Capture extension CORS allowlist MUST reflect current extension id

服务端 MUST 通过 `CAPTURE_CORS_ALLOWED_ORIGINS` 环境变量维护扩展 `chrome-extension://<id>` 白名单，扩展 ID 变更时该变量 MUST 同步更新。

#### Scenario: Renamed extension with new id requires allowlist refresh

- **GIVEN** 扩展目录从 `chrome-bilibili-capture` 重命名为 `chrome-capture`，生成新的扩展 ID
- **WHEN** 新扩展向 `POST /api/capture/jobs` 发起请求
- **THEN** `CAPTURE_CORS_ALLOWED_ORIGINS` MUST 包含新扩展的 `chrome-extension://<new-id>` origin

