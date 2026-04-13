# 提案：将 ASR 执行面迁移为 Worker 直连 DB 单一路径

## 背景

当前采集体系已支持 `POST /api/capture/jobs` 统一入库，并具备 ASR 处理代码能力。
但执行链路仍存在“Vercel 路由执行 + 外部 worker 触发”的混合形态：

- 执行入口依赖 HTTP 触发，受部署保护与入口策略影响；
- 长任务（`yt-dlp` 下载 + ASR 轮询）与 serverless 请求生命周期耦合；
- 执行面存在冗余 API（`claim/process/complete`）与历史脚本，增加排障复杂度。

项目尚未上线，适合一次性收敛为单一路径，避免历史兼容负担。

## 本次目标

1. 将 ASR 执行完全迁移到独立 worker 进程，worker 直接访问数据库领取/更新任务。
2. Vercel 仅保留控制面职责：创建任务、查询任务、重试任务。
3. 删除 worker 专用 HTTP 执行入口与触发脚本，形成“单一、干净、无历史冗余”的流程。
4. 使用事务化领取策略（行锁 + skip locked）保证多 worker 并发安全。

## 非目标

- 本次不引入外部消息队列（SQS/Redis/RabbitMQ）；
- 本次不扩展新的 ASR 供应商；
- 本次不调整用户可见交互（仍为“已收藏” + 后台处理）。

## 决策清单

### 本次沿用的既有决策

- `POST /api/capture/jobs` 作为采集统一入口；
- `CaptureJob` 为任务状态真相源，`CaptureArtifact.content` 为内容真相源；
- 官方字幕优先、ASR 回退、90 分钟裁剪策略保持不变。

### 本次新增/变更决策

- ASR 长任务执行 SHALL 在独立 worker 进程内完成，不在 Vercel 路由执行；
- worker SHALL 直连数据库进行 claim / status / artifact 更新；
- worker SHALL 使用常驻轮询服务（service）而非定时 HTTP 触发（timer + curl）；
- 系统 MUST 删除 worker 专用 HTTP 执行端点：`/api/capture/jobs/claim`、`/api/capture/jobs/process`、`/api/capture/jobs/[jobId]/complete`；
- 任务领取 MUST 采用事务化并发安全策略，避免重复领取。

## 预期收益

- 去除入口层 401/保护拦截对执行链路的影响；
- 长任务稳定性提升，执行路径更短且更易观测；
- 架构职责清晰（Vercel 控制面 / worker 执行面），后续扩容成本更低。