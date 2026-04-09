# CaptureContext 与三层采集模型说明

> 快速上手建议先看：`docs/capture-model-playbook.md`（更偏“人和 Agent 的速查手册”）。

本文定义 PineSnap 采集域的新模型与字段语义，覆盖：

- `Resource`（采集对象）
- `CaptureJob`（处理流程）
- `CaptureArtifact`（处理产物）
- `CaptureContext`（任务输入快照）

## 1. 为什么引入三层模型

旧模型把“收藏对象 + 处理过程 + 结果内容”混在 `Resource.content` 中，导致：

- 列表状态（处理中/失败/成功）语义不稳定；
- 无字幕回退、重试、重跑难以表达；
- 扩展到多来源时（YouTube/公众号/网页/小红书）结构耦合严重。

三层模型将语义拆开：

- `Resource`：记录“收藏了什么”
- `CaptureJob`：记录“处理到哪一步”
- `CaptureArtifact`：记录“产出了什么”

## 2. 实体关系

- 一个 `Resource` 对应多个 `CaptureJob`
- 一个 `CaptureJob` 产出多个 `CaptureArtifact`
- 一个 `CaptureArtifact` 归属一个 `Resource` 和一个 `CaptureJob`

## 3. 状态与展示规则

- 资源状态来自 `activeJob.status`
- 资源内容来自 `primary artifact`
- 两者分离，不从单个字段混推

`activeJob` 默认规则：

1. 只在 `superseded = false` 的任务里选
2. 选 `createdAt` 最新任务
3. 并列时按 `id` 稳定排序

## 4. CaptureContext 字段

`CaptureContext` 是创建任务时的输入快照，存储于 `CaptureJob.inputContext`。

### 4.1 通用必填字段


| 字段                 | 说明        | 用途     |
| ------------------ | --------- | ------ |
| `schemaVersion`    | schema 版本 | 兼容演进   |
| `sourceType`       | 来源类型      | 路由到处理器 |
| `sourceUrl`        | 原始来源链接    | 回溯与重试  |
| `canonicalUrl`     | 规范化链接     | 去重与聚合  |
| `captureRequestId` | 幂等键       | 防重复建任务 |
| `capturedAt`       | 客户端采集时间   | 时效判断   |


### 4.2 通用选填字段


| 字段                        | 说明     | 用途      |
| ------------------------- | ------ | ------- |
| `accessContext.referer`   | 来源页    | 提升访问成功率 |
| `accessContext.userAgent` | 客户端 UA | 调试与兼容   |
| `mediaCandidates[]`       | 候选媒体   | 优化下载/转写 |


### 4.3 平台扩展字段（providerContext）

- `providerContext.bilibili`：`bvid/aid/cid/p`
- `providerContext.youtube`：`videoId/channelId/playlistId`
- `providerContext.wechatArticle`：`biz/mid/idx/sn`
- `providerContext.webPage`：`titleHint/selectorHints`
- `providerContext.xiaohongshu`：`noteId/userId`

## 5. 幂等与唯一约束

- 任务幂等唯一键：`(userId, sourceType, captureRequestId)`
- 主产物唯一约束：同 `(resourceId, kind, language)` 同时最多一个 primary

## 6. 来源类型

当前统一支持以下 `sourceType`：

- `bilibili`
- `wechat_article`
- `web_page`
- `youtube`
- `xiaohongshu`

## 7. 接口概览

- `POST /api/capture/jobs`：创建任务
- `GET /api/capture/jobs/:jobId`：查询任务状态
- `GET /api/capture/resources/:resourceId/jobs`：查询资源任务历史
- `POST /api/capture/jobs/:jobId/retry`：按重试策略重新入队
- `POST /api/capture/jobs/claim`：worker 领取待处理任务（需 `CAPTURE_WORKER_KEY`）
- `POST /api/capture/jobs/:jobId/complete`：worker 回写终态与产物（需 `CAPTURE_WORKER_KEY`）

当前只保留统一入口 `POST /api/capture/jobs`，所有来源均通过该接口落库到 Job/Artifact 模型。