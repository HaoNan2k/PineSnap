# content-capture / spec delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Capture MUST persist Resource and Job atomically with idempotency

系统 MUST 在同一幂等流程中处理 `Resource` 与 `CaptureJob` 的创建，避免并发下出现孤儿数据。

系统 MUST 使用 `CaptureJob(resourceId, captureRequestId)` 作为任务去重键。

#### Scenario: Duplicate capture request returns existing job under same resource

- **GIVEN** 同一 `resourceId` 下重复提交相同 `captureRequestId`
- **WHEN** 请求到达 `POST /api/capture/jobs`
- **THEN** 服务端 MUST 命中同一条已存在 `CaptureJob`
- **AND** 服务端 MUST 返回已有 `resourceId` 与 `jobId`
