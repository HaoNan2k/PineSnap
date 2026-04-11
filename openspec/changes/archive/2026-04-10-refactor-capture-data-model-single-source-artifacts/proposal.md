# 提案：收敛采集与消息存储为单一内容真相源

## 背景

当前模型在开发过程中逐步演进，已形成 `Resource` / `CaptureJob` / `CaptureArtifact` 三层框架，但仍存在“可由关系推导却重复存储”的字段，以及 `Resource.content` 与 `CaptureArtifact.content` 的语义重叠：

- `Resource.content` 与 `CaptureJob.inputContext` 都承载输入上下文；
- `CaptureArtifact` 同时保存 `jobId` 与 `resourceId`，但 `resourceId` 实际可由 `jobId` 推导；
- `CaptureJob` 同时保存 `userId` 与 `resourceId`，但 `userId` 可由 `resourceId` 推导；
- 聊天 `Message` 既有结构化 `parts` 又有字符串 `content`，存在冗余与一致性维护成本。

项目尚未上线，允许破坏式调整与丢弃历史数据，适合一次性收敛为更简洁、更优雅的长期模型。

## 本次目标

1. 将可消费正文统一收敛到 `CaptureArtifact.content`（唯一内容真相源）。
2. 将 `Resource` 收敛为“对象索引壳”，仅保留稳定元数据与展示摘要。
3. 移除可推导冗余字段（`CaptureJob.userId`、`CaptureArtifact.resourceId`、`Message.content`）。
4. 将 `Resource` 简化为最小可用字段集合：`sourceType`、`title`、`canonicalUrl`、`thumbnailUrl`、`metadata`。
5. 为 supersede 链路与跨表一致性补齐数据库级约束。
6. 明确 learning/chat 的读取规则：内容优先读取 artifact，不再依赖 `Resource.content`。

## 非目标

- 本次不引入新的采集来源类型；
- 本次不引入新的 Worker 编排系统；
- 本次不做向后兼容迁移脚本（开发期允许 reset 数据）。

## 决策清单

### 沿用既有决策

- 采集与聊天解耦，采集流程 MUST NOT 隐式创建会话；
- 采集统一入口继续沿用 `POST /api/capture/jobs`；
- 任务状态真相源继续以 active job 规则判定；
- `parts/jsonb` 继续作为聊天消息的结构化存储格式。

### 本次新增/变更决策

- `CaptureArtifact.content` MUST 成为采集内容唯一真相源；
- `Resource.content` SHALL 重命名为 `metadata` 并降级为轻量摘要用途；
- `Resource` MUST 删除 `type` 与 `externalId` 字段，避免与 `sourceType` 语义重叠；
- `Resource` MUST 增加 `thumbnailUrl` 字段用于列表封面展示（URL 方案）；
- `Resource` SHOULD 仅保留 `canonicalUrl` 作为默认跳转链接；
- `CaptureJob.userId` MUST 删除，用户归属通过 `resourceId -> Resource.userId` 推导；
- `CaptureArtifact.resourceId` MUST 删除，资源归属通过 `jobId -> CaptureJob.resourceId` 推导；
- `CaptureJob.supersededByJobId` MUST 建立自关联外键；
- `Message.content` MUST 删除，仅保留 `parts` 作为消息内容持久化字段；
- learning/chat 在内容装配时 MUST 先取 artifact，缺失时才允许读取 `Resource.metadata` 的摘要字段。

## 预期收益

- 数据模型边界更清晰：对象、过程、结果各司其职；
- 减少字段冗余与双写一致性风险；
- 降低后续来源扩展与 schema 演进复杂度；
- 文档与实现对齐，便于长期维护与新成员上手。

