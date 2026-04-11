# Capture 模型速查手册（给人和 Agent）

这份文档用于 5 分钟内建立采集域共识。

## 一句话模型

- `Resource`：收藏对象壳（用于列表展示和跳转）
- `CaptureJob`：处理过程（状态、重试、错误、输入快照）
- `CaptureArtifact`：处理结果（唯一正文真相源）
- `CaptureContext`：创建任务时的输入契约

记忆法：**对象 / 过程 / 结果 / 输入**。

## 当前最小模型（已落地）

### Resource（最小可用字段）

- `sourceType`
- `title`
- `canonicalUrl`（默认跳转）
- `thumbnailUrl`（封面 URL）
- `metadata`（对象级元信息，非正文）

### CaptureJob（关键）

- `resourceId`
- `captureRequestId`
- `status` / `stage`
- `jobType` / `executionMode`
- `inputContext`

### CaptureArtifact（关键）

- `jobId`
- `kind` / `language` / `format`
- `isPrimary`
- `schemaVersion`
- `content`（正文真相源）

## 强约束（必须遵守）

- Job 幂等键：`(resourceId, captureRequestId)` 唯一
- 主产物唯一：同一资源下的同类产物（按 `kind + language`）同一时刻只允许一个 primary
- `CaptureJob.supersededByJobId` 必须可追溯到存在的 job

## 读取规则（不要混推）

- 列表状态：看 `activeJob.status`
- 列表正文：看 `primaryArtifact.content`
- 资源展示（封面/跳转/标签）：看 `Resource`

`activeJob` 规则：

1. 仅在 `superseded=false` 的 job 中选
2. 按 `createdAt` 最新优先
3. 并列按 `id` 稳定排序

## 高频误区

- 误区：`Resource.metadata` 可以存完整字幕/摘要  
  - 正解：`metadata` 只放对象元信息，完整正文必须进 `CaptureArtifact.content`
- 误区：列表内容可以直接读 `Resource`  
  - 正解：正文始终读 primary artifact
- 误区：同一请求重复提交会生成多个 job  
  - 正解：必须命中幂等键，返回同一 job

## 开发前自检清单

- 是否新增了可推导冗余字段？
- 是否把正文写到了 `Resource.metadata`？
- 是否破坏了 activeJob 选择规则？
- 是否可能出现双 primary artifact？

任一项不确定，先更新 OpenSpec 再改代码。