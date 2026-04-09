# 提案：重构为多来源三层采集模型（Resource / CaptureJob / CaptureArtifact）

## 背景

当前采集链路以统一采集入口同步写入 `Resource` 为核心，适用于“客户端已拿到完整结果”的场景。  
但该模式存在结构性问题：

- 采集对象、处理过程、处理结果混在一个资源语义中；
- 无法稳定表达“处理中/失败/重试中”等任务生命周期；
- 来源模型偏 Bilibili，难以扩展到 YouTube、公众号、网页、小红书；
- 无官方字幕等场景缺少统一回退到服务端任务化处理的机制。

产品目标已明确为：

- 继续保持“一键触发”交互；
- 客户端负责触发与上报上下文，服务端负责长时处理；
- 一次性升级到可长期维护的通用架构（当前未正式上线，可接受大改）。

## 本次目标

1. 建立三层模型：`Resource`（采集对象）+ `CaptureJob`（处理流程）+ `CaptureArtifact`（处理产物）。
2. 建立通用 `CaptureContext` 输入契约，覆盖 Bilibili / 公众号 / 网页 / YouTube / 小红书。
3. 定义任务状态真相源与展示规则：状态看 Job，内容看 Artifact。
4. 定义多来源任务类型、幂等键与主产物选择约束，避免竞态和重复写入。
5. 在 `docs/` 输出字段与用途文档，支持后续评审与开发协作。

## 非目标

- 本次不限定具体 ASR 或抓取供应商实现；
- 本次不设计客户端本地长时解析方案；
- 本次不做“灰度双写/回滚”上线策略设计（当前阶段可直接切换新模型）。

## 决策清单

### 沿用既有决策

- 采集与会话解耦：采集阶段 MUST NOT 隐式创建 Conversation/Message；
- 服务端是采集真相源：鉴权、队列、落库在服务端完成；
- 用户交互保持一键触发；
- 采集鉴权沿用服务端 Token 与 CORS allowlist 原则。

### 本次新增/变更决策

- `CaptureJob` 与 `CaptureArtifact` 作为新增一等实体，不再把任务状态塞入 `Resource.content`；
- 第一版 `CaptureJob.resourceId` MUST 为非空（先建 Resource，再建 Job）；
- `CaptureJob` MUST 增加 `jobType`，用于区分字幕抓取、音频转写、网页正文提取等任务意图；
- `CaptureJob` SHOULD 增加 `executionMode`（`INLINE`/`ASYNC`），用于区分同步快任务与后台任务；
- 任务幂等键采用 `(userId, sourceType, captureRequestId)`；
- Job 状态真相源规则：每个 Resource 选取一个 `activeJob`，列表状态以其为准；
- Artifact 主版本规则：同一 `(resourceId, kind, language)` 同时最多一个 `isPrimary=true`；
- `CaptureContext` 采用“通用字段 + `providerContext` 平台扩展字段”结构。

## 预期收益

- 采集模型从“单来源同步入库”升级为“多来源任务化处理”；
- 状态语义明确，失败与重试可观测；
- 为后续来源扩展复用统一任务框架，减少新增来源成本；
- 降低维护认知负担：对象、流程、产物边界清晰。