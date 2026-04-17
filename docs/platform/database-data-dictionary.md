# 数据库数据字典（长期维护）

本文档是 PineSnap 当前数据库模型的字段语义真相源，基于 `prisma/schema.prisma`。

## 设计原则

- 采集域采用三层模型：`Resource`（对象）/ `CaptureJob`（过程）/ `CaptureArtifact`（结果）。
- 可消费正文统一存放在 `CaptureArtifact.content`。
- `Resource.metadata` 仅用于对象级展示元信息，不承载完整正文。
- 聊天消息内容仅使用 `Message.parts`，不再维护冗余文本列。

## Conversation


| 字段                     | 类型          | 含义             |
| ---------------------- | ----------- | -------------- |
| `id`                   | `String`    | 会话主键（UUIDv7）   |
| `title`                | `String`    | 会话标题           |
| `userId`               | `String`    | 会话所属用户         |
| `createdAt`            | `DateTime`  | 创建时间           |
| `updatedAt`            | `DateTime`  | 最近活跃时间（用于列表排序） |
| `firstClientMessageId` | `String?`   | 首条消息幂等键        |
| `deletedAt`            | `DateTime?` | 软删除时间          |


约束：`@@unique([userId, firstClientMessageId])`。

## Message


| 字段                | 类型          | 含义                             |
| ----------------- | ----------- | ------------------------------ |
| `id`              | `String`    | 消息主键                           |
| `conversationId`  | `String`    | 所属会话 ID                        |
| `parentMessageId` | `String?`   | 预留分支/回溯父消息 ID                  |
| `createdAt`       | `DateTime`  | 创建时间                           |
| `role`            | `Role`      | 角色（user/assistant/system/tool） |
| `clientMessageId` | `String?`   | 客户端幂等键                         |
| `parts`           | `Json`      | 结构化消息内容（`ChatPart[]`）          |
| `deletedAt`       | `DateTime?` | 软删除时间                          |


约束：`@@unique([conversationId, clientMessageId])`。

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

### CaptureAuthCode

一次性授权码（短 TTL + 单次消费），用于扩展连接握手。