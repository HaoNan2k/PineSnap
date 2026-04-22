# CaptureContext 与三层采集模型说明

> 快速上手先看：`docs/capture-model-playbook.md`。本文更偏字段与规则细节。

## 1. 模型边界

- `Resource`：收藏对象壳（列表和跳转）
- `CaptureJob`：处理过程（状态机 + 审计）
- `CaptureArtifact`：处理结果（正文）

核心边界：

- 正文只在 `CaptureArtifact.content`
- `Resource.metadata` 只放对象展示元信息

## 2. Resource 最小字段

- `sourceType`
- `title`
- `canonicalUrl`
- `thumbnailUrl`
- `metadata`

说明：

- 用户点击跳转默认使用 `canonicalUrl`
- 封面展示使用 `thumbnailUrl`（URL 方案）
- 平台扩展展示信息放 `metadata`

## 3. CaptureContext（任务输入快照）

`CaptureContext` 存于 `CaptureJob.inputContext`。

### 3.1 通用必填

| 字段 | 说明 | 用途 |
| --- | --- | --- |
| `schemaVersion` | schema 版本 | 演进兼容 |
| `sourceType` | 来源类型 | 路由处理器 |
| `sourceUrl` | 原始来源链接 | 回溯审计 |
| `canonicalUrl` | 规范化链接（可选） | 去重/聚合 |
| `captureRequestId` | 请求幂等键 | 去重创建任务 |
| `capturedAt` | 客户端采集时间 | 时效判断 |

### 3.2 通用选填

| 字段 | 说明 | 用途 |
| --- | --- | --- |
| `accessContext.referer` | 来源页 | 访问成功率 |
| `accessContext.userAgent` | 客户端 UA | 调试兼容 |
| `mediaCandidates[]` | 候选媒体 | 下载/转写优化 |

### 3.3 providerContext 扩展

- `bilibili`: `bvid/aid/cid/p`
- `youtube`: `videoId/channelId/playlistId`
- `wechatArticle`: `biz/mid/idx/sn`
- `webPage`: `titleHint/selectorHints`
- `xiaohongshu`: `noteId/userId`

## 4. 约束与状态规则

### 4.1 幂等与唯一

- Job 幂等键：`(resourceId, captureRequestId)` 唯一
- 主产物规则：同一资源下同类产物（`kind + language`）同一时刻仅一个 primary

### 4.2 activeJob

1. 仅在 `superseded = false` 的 job 中选
2. `createdAt` 最新优先
3. 并列按 `id` 稳定排序

## 5. 接口概览

- `POST /api/capture/jobs`  
  创建新的 CaptureJob（或命中幂等返回现有任务），作为采集任务提交入口。

- `GET /api/capture/jobs/:jobId`  
  查询指定采集任务的详细状态与上下文信息。

- `GET /api/capture/resources/:resourceId/jobs`  
  查询指定资源（Resource）下的全部采集任务列表。

- `POST /api/capture/jobs/:jobId/retry`  
  触发对失败或需要重试的采集任务进行重新调度。

- 采集 worker 不通过 HTTP 领取/回写任务；worker 采用数据库直连方式消费 `CaptureJob` 队列并写回 `CaptureArtifact`。

统一入口仍为 `POST /api/capture/jobs`。