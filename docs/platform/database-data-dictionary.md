# 数据库数据字典（长期维护）

本文档是 PineSnap 当前数据库模型的字段语义真相源，基于 `prisma/schema.prisma`。

## 设计原则

- 采集域采用三层模型：`Resource`（对象）/ `CaptureJob`（过程）/ `CaptureArtifact`（结果）。
- 可消费正文统一存放在 `CaptureArtifact.content`。
- `Resource.metadata` 仅用于对象级展示元信息，不承载完整正文。
- 聊天消息内容仅使用 `Message.parts`，不再维护冗余文本列。

## Conversation


| 字段                     | 类型                 | 含义                                          |
| ---------------------- | ------------------ | ------------------------------------------- |
| `id`                   | `String`           | 会话主键（UUIDv7）                                |
| `title`                | `String`           | 会话标题                                        |
| `userId`               | `String`           | 会话所属用户                                      |
| `kind`                 | `ConversationKind` | 会话类型：`canvas`（学习主线，tool-only）或 `chat`（讨论伴学，自由文本）。历史会话默认 `canvas` |
| `createdAt`            | `DateTime`         | 创建时间                                        |
| `updatedAt`            | `DateTime`         | 最近活跃时间（用于列表排序）                              |
| `firstClientMessageId` | `String?`          | 首条消息幂等键                                     |
| `deletedAt`            | `DateTime?`        | 软删除时间                                       |


约束：`@@unique([userId, firstClientMessageId])`。

## Message


| 字段                        | 类型          | 含义                                                             |
| ------------------------- | ----------- | -------------------------------------------------------------- |
| `id`                      | `String`    | 消息主键                                                           |
| `conversationId`          | `String`    | 所属会话 ID                                                        |
| `parentMessageId`         | `String?`   | 预留分支/回溯父消息 ID                                                  |
| `createdAt`               | `DateTime`  | 创建时间                                                           |
| `role`                    | `Role`      | 角色（user/assistant/system/tool）                                 |
| `clientMessageId`         | `String?`   | 客户端幂等键                                                         |
| `parts`                   | `Json`      | 结构化消息内容（`ChatPart[]`）                                          |
| `deletedAt`               | `DateTime?` | 软删除时间                                                          |
| `anchoredCanvasMessageId` | `String?`   | **Light Anchor**：仅 `kind=chat` conversation 的消息使用，记录用户提问时所在的 canvas assistant message id；canvas conversation 的消息为 NULL。UI 默认不按 anchor 过滤——它是元数据，留给未来可能的 filter/分析功能 |


约束：`@@unique([conversationId, clientMessageId])`。自引用外键 `Message_anchoredCanvasMessageId_fkey`（`ON DELETE SET NULL`，被 anchored 的 canvas message 软删后，前端读到 NULL 的 anchor 应 fallback 到"无 anchor"显示）。

## Resource


| 字段                  | 类型                  | 含义              |
| ------------------- | ------------------- | --------------- |
| `id`                | `String`            | 资源主键            |
| `userId`            | `String`            | 资源所属用户          |
| `sourceType`        | `CaptureSourceType` | 来源平台类型          |
| `canonicalUrl`      | `String`            | 资源规范化跳转链接（默认跳转） |
| `sourceFingerprint` | `String?`           | 去重指纹            |
| `title`             | `String`            | 资源标题            |
| `thumbnailUrl`      | `String?`           | 封面图 URL（列表展示）   |
| `metadata`          | `Json?`             | 资源展示元信息（非正文）    |
| `createdAt`         | `DateTime`          | 创建时间            |
| `updatedAt`         | `DateTime`          | 更新时间            |


说明：资源列表/跳转优先使用 `title + canonicalUrl + thumbnailUrl`。

## ResourceSummary


| 字段               | 类型         | 含义                                                       |
| ---------------- | ---------- | -------------------------------------------------------- |
| `id`             | `String`   | 总结主键                                                     |
| `resourceId`     | `String`   | 关联资源 ID（**unique**，每个 resource 至多一份 summary）             |
| `userId`         | `String`   | 所属用户                                                     |
| `markdown`       | `String`   | 文档主体 markdown 文本（含 `## 概要` / `## 要点` 等小节）                |
| `oneLineSummary` | `String`   | 一句话概括，列表卡片预览展示                                           |
| `keyMoments`     | `Json`     | 关键时刻数组 `Array<{ label: string; seconds: number }>`，非视频源为空 |
| `model`          | `String`   | 生成所用 LLM 模型 ID                                           |
| `promptVersion`  | `String`   | prompt 版本号                                               |
| `durationMs`     | `Int`      | 单次生成耗时                                                   |
| `generatedAt`    | `DateTime` | 生成时间                                                     |


说明：1:1 关系（`resourceId` unique）。重新生成走 upsert，覆盖旧记录，不保留多版本。`keyMoments` 仅视频类源（`bilibili` / `youtube` 等）非空；点击渲染时跳转原视频对应秒数。

## CaptureJob


| 字段                  | 类型                     | 含义                     |
| ------------------- | ---------------------- | ---------------------- |
| `id`                | `String`               | 任务主键                   |
| `resourceId`        | `String`               | 所属资源 ID                |
| `sourceType`        | `CaptureSourceType`    | 任务来源类型                 |
| `jobType`           | `CaptureJobType`       | 任务意图（字幕抓取/转写/正文提取等）    |
| `executionMode`     | `CaptureExecutionMode` | 执行模式（`INLINE`/`ASYNC`） |
| `captureRequestId`  | `String`               | 请求幂等键                  |
| `status`            | `CaptureJobStatus`     | 任务状态                   |
| `stage`             | `CaptureJobStage?`     | 任务阶段                   |
| `inputContext`      | `Json`                 | 输入快照                   |
| `attempt`           | `Int`                  | 已重试次数                  |
| `maxAttempts`       | `Int`                  | 最大重试次数                 |
| `errorCode`         | `String?`              | 错误代码                   |
| `errorMessage`      | `String?`              | 错误信息                   |
| `superseded`        | `Boolean`              | 是否被后续任务替代              |
| `supersededByJobId` | `String?`              | 替代任务 ID（自关联）           |
| `startedAt`         | `DateTime?`            | 开始执行时间                 |
| `finishedAt`        | `DateTime?`            | 结束时间                   |
| `createdAt`         | `DateTime`             | 创建时间                   |
| `updatedAt`         | `DateTime`             | 更新时间                   |


约束：`@@unique([resourceId, captureRequestId])`。

## CaptureArtifact


| 字段              | 类型                       | 含义                     |
| --------------- | ------------------------ | ---------------------- |
| `id`            | `String`                 | 产物主键                   |
| `jobId`         | `String`                 | 所属任务 ID                |
| `kind`          | `CaptureArtifactKind`    | 产物类型（官方字幕/ASR/摘要/抽取文本） |
| `language`      | `String?`                | 语言标记                   |
| `format`        | `CaptureArtifactFormat?` | 内容格式                   |
| `schemaVersion` | `Int`                    | 产物内容 schema 版本         |
| `isPrimary`     | `Boolean`                | 是否主版本                  |
| `qualityScore`  | `Float?`                 | 质量评分                   |
| `content`       | `Json`                   | 产物正文内容（唯一正文真相源）        |
| `createdAt`     | `DateTime`               | 创建时间                   |


说明：学习/下游消费优先读取 primary artifact。

## Learning / 关联表

### Learning


| 字段          | 类型          | 含义        |
| ----------- | ----------- | --------- |
| `id`        | `String`    | 学习会话主键    |
| `plan`      | `String?`   | 学习计划文本    |
| `clarify`   | `Json?`     | 澄清问答结构化数据 |
| `createdAt` | `DateTime`  | 创建时间      |
| `updatedAt` | `DateTime`  | 更新时间      |
| `deletedAt` | `DateTime?` | 软删除时间     |


### LearningResource

`learningId + resourceId` 复合主键，表示学习会话与资源的多对多关系。

### LearningConversation

`learningId + conversationId` 复合主键，表示学习会话与聊天会话的关联关系。

## Capture 鉴权

### CaptureToken

扩展/API 调用令牌（只存 hash，不存明文），含 `scopes`、`revokedAt`、`lastUsedAt`。

新版扩展（`PineSnap Capture 扩展` label）发的 token 携带 `capture:*` 通配符 scope，覆盖所有源；旧版 token（`Bilibili 扩展` label，scope `capture:bilibili`）仍可采集 bilibili。撤销时按 label 不限 scope，新旧 label 一并清理。

### CaptureAuthCode

一次性授权码（短 TTL + 单次消费），用于扩展连接握手。

## Capture 枚举（Phase C 收敛后）

### CaptureSourceType

| 值 | 含义 | 备注 |
|---|------|------|
| `bilibili` | B 站视频 | |
| `youtube` | YouTube 视频 | |
| `douyin` | 抖音视频 | 暂未实现 extractor |
| `web_page` | 所有非视频源（博客 / 公众号 / 知乎 / 文档站等） | 站点区分依赖 `providerContext.webPage.extractor` |

`wechat_article` / `xiaohongshu` 在 Phase C migration `20260425143247_consolidate_source_and_job_types` 中删除，统一并入 `web_page`。

### CaptureJobType

| 值 | 触发场景 |
|---|---------|
| `subtitle_fetch` | bilibili / youtube 字幕扩展端预抽 → API 同步落库（不进 worker 队列） |
| `audio_transcribe` | bilibili 字幕失败 → ASR fallback；进 worker 队列由 AssemblyAI 转写 |
| `web_extract` | 文章型扩展端预抽 → API 同步落库（不进队列） |
| `summary_generate` | 暂未启用 |
| `media_ingest` | 暂未启用 |

`article_extract` 在 Phase C 删除（与 `web_extract` 完全语义重叠，无 handler 区分）。

### CaptureArtifactKind / CaptureArtifactFormat

| Kind | Format | 含义 |
|------|--------|------|
| `official_subtitle` | `cue_lines` | 视频官方字幕（bilibili / youtube）|
| `asr_transcript` | `cue_lines` | ASR 转写结果（AssemblyAI）|
| `extracted_text` | `markdown` | 文章型抽取正文（generic / wechat / zhihu）|
| `summary` | `json` | AI 摘要（暂未启用为主产物） |
| `extracted_text` | `plain_text` | 暂未使用 |
| 其他 kind | `binary_ref` | 暂未使用 |

文章型 `content` 结构：`{ markdown, title, author?, publishedAt?, cover?, sourceHtml?, wordCount? }`。

### providerContext.webPage.extractor (zod enum)

| 值 | 对应扩展端 SITE_ADAPTERS provider |
|---|----------------------------------|
| `generic_article_v1` | 通用兜底（Defuddle）|
| `wechat_article_v1` | 微信公众号 |
| `zhihu_answer_v1` | 知乎答案 / 专栏 |