# 设计：多来源三层采集模型（Resource / CaptureJob / CaptureArtifact）

## 1. 设计目标

将采集域从“单来源同步入库”升级为“多来源任务化处理”，并建立稳定边界：

- `Resource`：用户收藏对象（来源链接与归属）
- `CaptureJob`：处理流程（排队、执行、重试、失败）
- `CaptureArtifact`：处理产物（官方字幕、ASR、摘要、正文等）

适配来源：

- `bilibili`
- `wechat_article`
- `web_page`
- `youtube`
- `xiaohongshu`

## 2. 关系模型

### 2.1 实体关系

- 一个 `Resource` MUST 对应多个 `CaptureJob`
- 一个 `CaptureJob` MUST 对应零个或多个 `CaptureArtifact`
- 一个 `CaptureArtifact` MUST 归属一个 `Resource` 与一个 `CaptureJob`

### 2.2 关键约束

- `CaptureJob.resourceId` MUST 为非空
- `CaptureJob.jobType` MUST 为非空且使用枚举
- `CaptureJob.executionMode` SHOULD 为非空并区分同步/异步执行
- `CaptureJob` 幂等唯一键 MUST 为 `(userId, sourceType, captureRequestId)`
- `CaptureArtifact` 主版本唯一约束 MUST 为 `(resourceId, kind, language, isPrimary=true)` 唯一

## 3. 状态真相源与展示规则

### 3.1 Job 状态机

- `PENDING`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `CANCELLED`

### 3.1.1 Job 类型与执行模式

`CaptureJob` MUST 包含以下分类维度：

- `jobType`：任务意图（例如 `subtitle_fetch`、`audio_transcribe`、`web_extract`、`article_extract`、`summary_generate`）
- `executionMode`：执行方式（`INLINE` / `ASYNC`）

语义约束：

- 同步秒完成路径（如客户端已拿到字幕）SHOULD 使用 `executionMode=INLINE`
- 后台队列路径 SHOULD 使用 `executionMode=ASYNC`
- 列表与审计 MUST 能基于 `jobType` 做统计与过滤

### 3.2 Active Job 选择规则

每个 `Resource` MUST 存在“当前有效任务（activeJob）”判定规则：

1. 只在非 superseded 的 job 中选择；
2. 优先选择 `createdAt` 最新的 job；
3. 如并列，按 `id` 字典序稳定排序。

### 3.3 列表展示规则

- 资源状态 MUST 来自 `activeJob.status`
- 展示内容 MUST 来自 `CaptureArtifact` 的 primary 版本
- 状态与内容 MUST 分离，不允许从单一字段混推

## 4. CaptureContext 契约

`CaptureContext` 作为 job 输入快照，存于 `CaptureJob.inputContext`（JSONB）。

### 4.1 顶层通用字段

- `schemaVersion` (number)
- `sourceType` (`bilibili` | `wechat_article` | `web_page` | `youtube` | `xiaohongshu`)
- `sourceUrl` (string)
- `canonicalUrl` (string)
- `captureRequestId` (string)
- `capturedAt` (ISO string)
- `accessContext` (object, optional)
- `mediaCandidates` (array, optional)
- `providerContext` (object, optional)

### 4.2 providerContext 示例

- `providerContext.bilibili`: `bvid/aid/cid/p`
- `providerContext.youtube`: `videoId/channelId`
- `providerContext.wechatArticle`: `biz/mid/idx/sn`
- `providerContext.webPage`: `titleHint/selectorHints`
- `providerContext.xiaohongshu`: `noteId/userId`

### 4.3 规范化策略

- 系统 MUST 生成 `canonicalUrl` 作为去重与聚合基础
- 系统 MUST 生成 `sourceFingerprint`（可存 Resource）用于跨来源稳定去重

## 5. API 设计（V1）

- `POST /api/capture/jobs`
  - 输入：`CaptureContext` + 任务类型参数
  - 输出：`{ ok: true, resourceId, jobId, status }`
- `GET /api/capture/jobs/:jobId`
  - 输出：状态、阶段、错误码、结果摘要
- `GET /api/capture/resources/:resourceId/jobs`
  - 输出：该资源任务历史

> 说明：旧的来源专用直写接口将被替换为统一任务入口，客户端仍保持“一键触发”。

## 6. 执行流程

1. 客户端提交 `CaptureContext`
2. 服务端先建 `Resource`
3. 服务端按幂等键建/取 `CaptureJob`
4. worker 消费 job 执行抓取/解析/转写
5. 写入 `CaptureArtifact` 并更新 primary
6. 更新 job 终态

## 7. 安全与治理

- 敏感字段 MUST 脱敏日志
- 临时文件 MUST 任务结束即清理
- 输入 context MUST 只含最小必要字段
- 失败 MUST 保留任务与资源记录，不丢收藏对象

## 8. 文档要求（docs）

实现阶段 MUST 在 `docs/` 产出“CaptureContext 字段与用途”文档，至少包含：

1. 字段总览（必填/选填）
2. 每个字段在服务端中的用途
3. Job 状态机与 activeJob 选择规则
4. Artifact 主版本选择规则
5. 多来源 `providerContext` 示例

