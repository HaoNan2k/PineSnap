# 设计：单一内容真相源与去冗余数据模型

## 1. 设计原则

本次重构遵循四条原则：

1. **单一真相源**：同一语义只在一个位置持久化。
2. **可推导不落库**：可由关系稳定推导出的字段不重复存储。
3. **对象/过程/结果分离**：`Resource` / `CaptureJob` / `CaptureArtifact` 职责边界清晰。
4. **数据库约束优先**：关键一致性尽量由 DB 约束兜底而非仅靠应用约定。

## 2. 目标模型

### 2.1 Resource（对象层）

定位：记录“收藏了什么”，不承载完整正文语义。

建议字段（最小可用版本）：

- `id`
- `userId`
- `sourceType`
- `canonicalUrl`
- `sourceFingerprint`
- `title`
- `thumbnailUrl`
- `metadata Json?`（替代 `content`，仅摘要/UI 元信息）
- `createdAt`
- `updatedAt`

删除字段：

- `type`
- `externalId`
- `sourceUrl`

约束：

- 索引保留 `userId`、`(userId, sourceType)`、`(userId, sourceFingerprint)`。
- 默认跳转链接 SHOULD 使用 `canonicalUrl`。

### 2.2 CaptureJob（过程层）

定位：记录处理流程与审计信息。

建议字段：

- `id`
- `resourceId` (FK -> Resource.id)
- `sourceType`
- `jobType`
- `executionMode`
- `captureRequestId`
- `status`
- `stage`
- `inputContext Json`
- `attempt`
- `maxAttempts`
- `errorCode`
- `errorMessage`
- `superseded`
- `supersededByJobId` (FK -> CaptureJob.id, nullable)
- `startedAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

删除字段：

- `userId`（由 `resourceId` 推导）

关键约束：

- 任务幂等唯一键改为 `@@unique([resourceId, captureRequestId])`；
- `supersededByJobId` 自关联外键，避免悬挂引用。

### 2.3 CaptureArtifact（结果层）

定位：采集结果的唯一内容真相源。

建议字段：

- `id`
- `jobId` (FK -> CaptureJob.id)
- `kind`
- `language`
- `format`
- `schemaVersion`（新增）
- `isPrimary`
- `qualityScore`
- `content Json`
- `createdAt`

删除字段：

- `resourceId`（由 `jobId -> resourceId` 推导）

关键约束：

- primary 唯一约束改为按 job->resource 关联可判定的维度实现；
- 同步保留 `jobId`、`createdAt` 相关索引以保障查询性能。

## 3. Chat 存储收敛

`Message` 删除 `content` 字段，仅保留：

- `parts Json`（唯一消息内容语义）
- 其余结构字段（`id/conversationId/role/clientMessageId/createdAt/deletedAt`）不变。

说明：文本预览需要时由 `parts` 动态提取，不再维护双份存储。

## 4. 读取规则

### 4.1 资源列表/详情

- 状态：读取 active job（`superseded=false` 最新）；
- 内容：读取 primary artifact；
- 摘要：仅在无 artifact 时读取 `Resource.metadata`。

### 4.2 Learning 上下文装配

- MUST 优先消费 primary artifact 内容；
- MAY 回退 `Resource.metadata`（仅摘要字段）；
- MUST NOT 将 `Resource.metadata` 当作完整正文输入。

### 4.3 Chat 消息回放

- MUST 仅依赖 `Message.parts` 回放；
- `parts` 到模型/UI 的转换逻辑维持现有 converter。

## 5. 数据迁移策略（开发期）

由于当前允许丢弃历史数据，采用“重建优先”策略：

1. 直接调整 Prisma schema 与迁移；
2. 本地/开发环境重置数据库；
3. 按新写入路径重新生成测试数据；
4. 不提供旧数据兼容回填脚本。

## 6. 风险与防护

- 风险：去除冗余字段后，旧代码读取路径可能空值。
  - 防护：统一替换读取层函数，禁止跨层直查旧字段。
- 风险：artifact 查询链路增加 join，可能影响性能。
  - 防护：补齐索引并在高频接口做 select 收敛。
- 风险：spec 与实现偏移。
  - 防护：先完成 OpenSpec 校验，再进入实现并执行关键路径回归。
