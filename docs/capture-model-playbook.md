# Capture 模型速查手册（给人和 Agent）

这份文档是采集域的“快速真相源”，目标：

1. 新同学 5 分钟看懂核心关系
2. Agent 在实现/排障时不走弯路

---

## 1. 一句话理解

- `Resource`：用户收藏了什么（对象）
- `CaptureJob`：系统怎么处理它（过程）
- `CaptureArtifact`：处理产出了什么（结果）
- `CaptureContext`：这次处理的输入快照（上下文）

> 记忆法：**对象 / 过程 / 结果 / 输入**

---

## 2. 为什么每个 Resource 都要有 Job

即便是“同步秒完成”的场景，也应记录一条 `CaptureJob`，原因：

- 语义统一：避免“同步路径一套，异步路径一套”
- 可观测：后续统计成功率、失败码、耗时都依赖 job
- 可演进：今天秒完成，明天可能变慢，不需要重构数据模型

因此：

- 同步快路径：`executionMode = INLINE`
- 后台任务：`executionMode = ASYNC`

---

## 3. 关系与约束（必须遵守）

### 3.1 关系

- 一个 `Resource` 可对应多个 `CaptureJob`（重试/重跑）
- 一个 `CaptureJob` 可对应多个 `CaptureArtifact`
- 一个 `CaptureArtifact` 必须归属一个 `Resource` 和一个 `CaptureJob`

### 3.2 强约束

- Job 幂等键：`(userId, sourceType, captureRequestId)` 唯一
- 主产物唯一：同 `(resourceId, kind, language)` 同时最多一个 `isPrimary=true`
- `CaptureJob.resourceId` 不允许为空

---

## 4. 列表展示规则（不要混推）

- 列表状态：看 `activeJob.status`
- 列表内容：看 `primaryArtifact`

`activeJob` 规则：

1. 在 `superseded=false` 的 job 中选择
2. 取最新 `createdAt`
3. 并列时按 `id` 稳定排序

---

## 5. Job 的两个关键维度

### 5.1 `jobType`（做的是什么）

当前枚举：

- `subtitle_fetch`
- `audio_transcribe`
- `web_extract`
- `article_extract`
- `summary_generate`
- `media_ingest`

### 5.2 `executionMode`（怎么执行）

- `INLINE`：同步/快速完成
- `ASYNC`：后台队列

---

## 6. CaptureContext（输入契约）

通用必填：

- `schemaVersion`
- `sourceType`
- `sourceUrl`
- `canonicalUrl`（可由服务端规范化）
- `captureRequestId`
- `capturedAt`

常见扩展：

- `providerContext.bilibili`: `bvid/aid/cid/p`
- `providerContext.youtube`: `videoId/channelId/playlistId`
- `providerContext.wechatArticle`: `biz/mid/idx/sn`
- `providerContext.webPage`: `titleHint/selectorHints`
- `providerContext.xiaohongshu`: `noteId/userId`

---

## 7. API 语义（最常用）

- `POST /api/capture/jobs`：创建（或命中幂等）任务
- `GET /api/capture/jobs/:jobId`：查询任务
- `GET /api/capture/resources/:resourceId/jobs`：查某资源全部任务
- `POST /api/capture/jobs/:jobId/retry`：按策略重试
- `POST /api/capture/jobs/claim`：worker 拉取待执行任务
- `POST /api/capture/jobs/:jobId/complete`：worker 回写终态/产物

当前唯一采集入口：

- `POST /api/capture/jobs`

---

## 8. 常见误区（高频踩坑）

- 误区 1：`Resource.content` 就是最终展示真相  
  - 正解：展示内容优先看 `primaryArtifact`；`Resource.content` 更多是来源对象内容/兼容字段
- 误区 2：幂等只要 Job 唯一键就够  
  - 正解：必须把“建 Resource + 建 Job”放在同事务幂等流程里，避免孤儿资源
- 误区 3：scope 有 `capture:`* 就不需要来源校验  
  - 正解：读取 job/resource 时仍应按 `sourceType` 做最小权限校验

---

## 9. Agent 实现清单（每次改动前看）

- 改动是否破坏了 `activeJob` 规则？
- 改动是否可能产生双 primary artifact？
- 改动是否绕过了幂等键？
- 改动是否把“状态”和“内容”混在一个字段里？
- 改动是否影响了 learning 对资源内容的读取兼容？

如果任一项答案为“是/不确定”，先补测试或先更新 OpenSpec。

---

## 10. 当前数据状态（已执行）

历史数据已经完成一次性回填：

- 旧资源补齐了 `sourceType/sourceUrl/canonicalUrl/sourceFingerprint`
- 每条历史 `Resource` 已补一条 `CaptureJob`
- 已补 `CaptureArtifact`（有 transcript/summary 的资源）
- 已补 `jobType` 与 `executionMode`（历史样本当前为 `subtitle_fetch + INLINE`）
- 历史回填任务已归并为正常阶段值（`COMPLETED`），不保留导入专用阶段记录

