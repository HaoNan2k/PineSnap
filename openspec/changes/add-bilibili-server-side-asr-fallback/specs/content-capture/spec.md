# content-capture / spec delta

## ADDED Requirements

### Requirement: 系统 MUST 采用 Resource / CaptureJob / CaptureArtifact 三层采集模型

系统 MUST 将采集对象、处理流程、处理产物分离建模，避免单实体承载多重语义。

#### Scenario: Job and artifact are modeled independently from resource

- Given 用户创建一个来源采集请求
- When 服务端受理并执行采集
- Then 系统 MUST 创建 `Resource` 记录采集对象
- And 系统 MUST 创建关联的 `CaptureJob` 记录处理流程
- And 系统 MUST 将处理结果写入 `CaptureArtifact`

### Requirement: CaptureContext 契约 MUST 支持多来源并可扩展

系统 MUST 定义统一 `CaptureContext` 输入结构，支持以下来源：`bilibili`、`wechat_article`、`web_page`、`youtube`、`xiaohongshu`。

#### Scenario: Required common fields are validated before job creation

- Given 客户端请求创建采集任务
- When 请求体缺失 `schemaVersion`、`sourceType`、`sourceUrl`、`canonicalUrl`、`capturedAt` 或 `captureRequestId`
- Then 服务端 MUST 拒绝创建任务并返回明确参数错误语义

#### Scenario: Provider-specific fields are carried in providerContext

- Given `sourceType` 为 `bilibili`
- When 客户端提交 `providerContext.bilibili`
- Then 服务端 MUST 允许并校验该来源专用字段
- And 非该来源字段 MUST NOT 污染通用顶层字段定义

### Requirement: CaptureJob MUST 使用统一状态机并支持幂等

系统 MUST 对采集任务使用统一状态机，至少包含 `PENDING`、`RUNNING`、`SUCCEEDED`、`FAILED`、`CANCELLED`。
系统 MUST 对重复请求按幂等键去重。

#### Scenario: Duplicate request reuses existing job by idempotency key

- Given 同一用户提交两次相同 `(userId, sourceType, captureRequestId)`
- When 第二次请求到达服务端
- Then 服务端 MUST 返回已存在任务而非创建新任务

#### Scenario: Job state transition is queryable

- Given 客户端持有 `jobId`
- When 客户端查询任务状态
- Then 服务端 MUST 返回当前状态、错误码与结果摘要

### Requirement: CaptureJob MUST 包含任务类型与执行模式

系统 MUST 为每个任务记录 `jobType`，并 SHOULD 记录 `executionMode`（`INLINE`/`ASYNC`），以支持同步快任务与后台任务的统一审计。

#### Scenario: Fast inline subtitle ingestion still creates typed job

- Given 客户端已拿到完整字幕并以同步方式提交
- When 服务端创建任务记录
- Then 任务 MUST 写入明确的 `jobType`（例如 `subtitle_fetch`）
- And 任务 SHOULD 标记 `executionMode=INLINE`

### Requirement: Resource 状态展示 MUST 以 activeJob 为真相源

系统 MUST 定义每个 `Resource` 的 `activeJob` 选择规则，并以其状态作为资源状态展示来源。

#### Scenario: Latest non-superseded job is selected as activeJob

- Given 一个 `Resource` 下存在多个历史 job
- When 系统计算展示状态
- Then 系统 MUST 在非 superseded job 中选择最新 job 作为 activeJob
- And 客户端列表状态 MUST 使用 activeJob.status

### Requirement: CaptureArtifact MUST 维护 primary 版本唯一性

系统 MUST 允许同一资源存在多个产物版本，但同一 `(resourceId, kind, language)` 在同一时刻 MUST 仅有一个 primary。

#### Scenario: Primary switching keeps uniqueness

- Given 系统为同一资源写入新的同类产物
- When 新产物被提升为 primary
- Then 系统 MUST 在同一事务中取消旧 primary 并设置新 primary
- And 数据库约束 MUST 防止双 primary

### Requirement: 系统 MUST 保留失败任务与来源对象关联

系统 MUST 在任务失败时保留 `Resource` 与 `CaptureJob` 记录，保证“收藏不丢失、可重试”。

#### Scenario: Failed job does not delete resource

- Given 任务执行最终失败
- When 用户查看来源列表
- Then 该来源对应的 Resource MUST 仍然可见
- And 用户 MUST 可以基于该资源再次发起任务

### Requirement: 团队 MUST 在 docs 中沉淀 CaptureContext 与三层模型文档

系统 MUST 在 `docs/` 提供字段与模型文档，覆盖 `CaptureContext` 字段用途、activeJob 规则、artifact primary 规则。

#### Scenario: Documentation supports onboarding and review

- Given 新开发者阅读文档
- When 开发者实现新来源采集（例如 YouTube）
- Then 文档 MUST 说明通用字段与 providerContext 的映射方法
- And 文档 MUST 说明状态与内容的查询来源

## MODIFIED Requirements

### Requirement: Capture ingestion MUST persist Resource through unified job entry

系统 SHALL 通过统一任务入口受理采集，并先创建 `Resource`，再创建关联 `CaptureJob`。

系统 MUST 返回 `resourceId` 与 `jobId`，以支持对象展示与任务查询分离。

#### Scenario: Unified capture entry returns both resource and job identifiers

- Given 客户端提交合法采集请求
- When 服务端受理请求
- Then 响应 MUST 包含 `{ ok: true, resourceId: string, jobId: string }`
- And 客户端后续 MUST 通过 job 查询接口获取处理状态
