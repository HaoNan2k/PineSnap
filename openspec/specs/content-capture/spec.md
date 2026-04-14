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

