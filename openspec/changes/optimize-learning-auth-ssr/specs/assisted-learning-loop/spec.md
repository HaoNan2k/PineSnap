# assisted-learning-loop（Delta Spec）

## ADDED Requirements

### Requirement: Learning state tRPC MUST provide initial data in one request
系统 SHALL 提供 tRPC `learning.getState` 用于获取学习页首屏所需数据，并以单次请求返回 learning、resources、conversationId 与 initialMessages。

#### Scenario: Fetch learning state
- **WHEN** 客户端以 `{ learningId }` 调用 `learning.getState`
- **THEN** 系统 MUST 返回 `learning`、`resources`、`conversationId` 与 `initialMessages`

#### Scenario: Unauthorized request
- **WHEN** 未登录用户调用 `learning.getState`
- **THEN** 系统 MUST 返回 `UNAUTHORIZED`

#### Scenario: Learning not found
- **WHEN** `learningId` 不存在或已删除
- **THEN** 系统 MUST 返回 `NOT_FOUND`

#### Scenario: Forbidden access
- **WHEN** `learningId` 不属于当前用户
- **THEN** 系统 MUST 返回 `FORBIDDEN`

#### Scenario: Invalid request body
- **WHEN** 请求体不符合 schema
- **THEN** 系统 MUST 返回 `BAD_REQUEST`

## MODIFIED Requirements

### Requirement: Learn Focus page MUST render as SSR shell and load data on client
系统 SHALL 在访问 `/learn/[learningId]` 时仅渲染首屏壳（不执行鉴权与 DB 查询），并在客户端通过 `learning.getState` 加载学习数据。

#### Scenario: SSR renders shell only
- **WHEN** 用户访问 `/learn/[learningId]`
- **THEN** SSR MUST 返回壳结构（不触发鉴权/DB 查询）
- **AND** 客户端 MUST 通过 `learning.getState` 拉取完整数据

### Requirement: Learning APIs MUST use unified authentication at middleware
系统 SHALL 在 Middleware 中对 `/api/learn/:path*` 执行强鉴权，并在 API 端优先复用 Middleware 透传的用户信息。

#### Scenario: Middleware blocks unauthenticated API
- **WHEN** 未登录用户请求 `/api/learn/*`
- **THEN** 系统 MUST 返回 401 JSON

#### Scenario: API reuses middleware identity
- **WHEN** Middleware 已透传用户身份
- **THEN** API 端 MUST 复用该身份并避免重复鉴权
