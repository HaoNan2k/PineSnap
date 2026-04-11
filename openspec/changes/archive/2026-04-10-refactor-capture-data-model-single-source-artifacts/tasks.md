# 任务清单：单一内容真相源与去冗余重构

## 0. OpenSpec 准备

- 0.1 运行 `openspec validate refactor-capture-data-model-single-source-artifacts --strict`
- 0.2 与团队确认“开发期可丢弃旧数据”前提并记录在 PR 描述

## 1. Prisma Schema 重构

- 1.1 `Resource.content` 重命名为 `metadata`（`Json?`）并更新注释语义
- 1.2 删除 `Resource.type` 与 `Resource.externalId`
- 1.3 新增 `Resource.thumbnailUrl`
- 1.4 删除 `CaptureJob.userId`
- 1.5 删除 `CaptureArtifact.resourceId`
- 1.6 为 `CaptureJob.supersededByJobId` 增加自关联外键
- 1.7 `CaptureArtifact` 新增 `schemaVersion` 字段
- 1.8 删除 `Message.content`
- 1.9 调整唯一键与索引（含 `CaptureJob(resourceId, captureRequestId)`）

## 2. DB 访问层与 API 收敛

- 2.1 更新 `lib/db/capture-job.ts` 去除 `userId` 写入/查询依赖
- 2.2 更新 `lib/db/capture-artifact.ts` 去除 `resourceId` 写入路径
- 2.3 更新 `app/api/capture/jobs/**` 查询与响应映射（通过 job 关联 resource）
- 2.4 更新 `lib/db/resource.ts` 与调用方：内容语义改为 `metadata`
- 2.5 更新 `lib/db/message.ts` 与聊天 API，移除 `Message.content` 相关逻辑

## 3. Learning/Chat 读取规则统一

- 3.1 更新 learning 资源上下文装配：先读 primary artifact，再回退 `Resource.metadata`
- 3.2 清理任何将 `Resource.content` 作为正文真相源的代码路径
- 3.3 确保消息回放仅依赖 `Message.parts`

## 4. 文档沉淀（docs）

- 4.1 新增 `docs/database-data-dictionary.md`（覆盖所有表与字段语义）
- 4.2 更新采集域文档，明确 `Resource.metadata` 与 `CaptureArtifact.content` 边界
- 4.3 增补“状态看 job、内容看 artifact”的统一读取规则

## 5. 验证与回归

- 5.1 执行迁移并验证可用（开发库已应用迁移）
- 5.2 回归采集主路径：创建任务、查询状态、写入产物、列表展示
- 5.3 回归学习路径：读取 artifact 内容生成上下文
- 5.4 回归聊天路径：发送/回放消息不依赖 `Message.content`
- 5.5 运行 lint/typecheck 并修复新增问题

