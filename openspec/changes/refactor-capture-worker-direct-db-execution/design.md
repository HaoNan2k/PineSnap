# 设计：Capture 执行面迁移为 Worker 直连 DB

## 1. 架构分层

### 控制面（Vercel）

保留：

- `POST /api/capture/jobs`（创建任务）
- `GET /api/capture/jobs/[jobId]`（查询状态）
- `POST /api/capture/jobs/[jobId]/retry`（重试）

移除：

- `POST /api/capture/jobs/claim`
- `POST /api/capture/jobs/process`
- `POST /api/capture/jobs/[jobId]/complete`

### 执行面（Worker）

新增常驻 worker 入口（Node.js 进程），循环执行：

1. 事务领取 `PENDING` 任务（`audio_transcribe`）；
2. 标记 `RUNNING/CLAIMED`；
3. 调用 `processAudioTranscribeJob` 执行下载 + ASR + 映射；
4. 写入 `asr_transcript` artifact；
5. 标记 `SUCCEEDED/COMPLETED`；
6. 异常时标记 `FAILED` + errorCode/errorMessage。

## 2. 任务领取并发模型

现有“先查后更”改为事务化原子领取：

- 在单个事务中选取候选任务并行锁定；
- 使用 PostgreSQL `FOR UPDATE SKIP LOCKED` 避免并发冲突；
- 对被领取任务原子更新为 `RUNNING` 并写入 `startedAt`。

## 3. 代码组织

新增：

- `worker/main.ts`：进程入口与主循环；
- `worker/loop.ts`（可选）：批处理执行逻辑；
- `worker/env.ts`（可选）：环境变量校验。

复用：

- `lib/capture/job-processor.ts`
- `lib/capture/audio-download.ts`
- `lib/capture/assemblyai.ts`
- `lib/db/capture-job.ts`
- `lib/db/capture-artifact.ts`

适配点：

- 现有 `lib/**` 中 `import "server-only"` 与独立 Node worker 兼容；
- 避免把 worker 特定逻辑写回 Next.js route。

## 4. 运行与运维

- worker 使用 systemd service 常驻运行；
- 不再使用 timer + curl 触发；
- 基础配置：
  - `WORKER_POLL_INTERVAL_MS`
  - `WORKER_BATCH_SIZE`
  - `CAPTURE_WORKER_SOURCE_TYPE`（可选）

## 5. 失败与重试语义

- 失败分类沿用现有 ASR 错误码体系；
- `retry` 仍通过现有 API 将失败任务重新置回 `PENDING`；
- worker 主循环仅消费 `PENDING` 任务，不直接改写重试策略。

## 6. 迁移步骤

1. 新增 worker 常驻入口并接通 DB 领取+执行；
2. 切换云端 systemd 到 worker service；
3. 删除 worker 专用 HTTP 路由与旧触发脚本；
4. 回归验证：创建任务 -> worker 执行 -> artifact 入库 -> 状态查询。

## 7. 风险与缓解

- 风险：worker 多实例竞争领取。
  - 缓解：`FOR UPDATE SKIP LOCKED`。
- 风险：worker 异常退出导致短暂堆积。
  - 缓解：systemd `Restart=always` + 小批量轮询。
- 风险：server-only 导致运行时兼容问题。
  - 缓解：将共享逻辑限制在服务端上下文，确保 worker 运行环境可加载。

