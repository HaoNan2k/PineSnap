## ADDED Requirements

### Requirement: ASR 执行 MUST 由独立 worker 进程完成

系统 MUST 将 `audio_transcribe` 的下载、转写与产物写入流程放在独立 worker 进程执行，不得在 Vercel 路由中直接执行长任务。

#### Scenario: Worker executes full ASR pipeline

- **GIVEN** 数据库中存在 `jobType=audio_transcribe` 且 `status=PENDING` 的任务
- **WHEN** worker 进程轮询并领取任务
- **THEN** worker MUST 在进程内完成音频下载、ASR 调用、转写映射与落库
- **AND** worker MUST 将任务终态更新为 `SUCCEEDED` 或 `FAILED`

### Requirement: Worker 领取任务 MUST 使用并发安全事务

系统 MUST 通过数据库事务和行级锁（含 `SKIP LOCKED` 语义）领取待处理任务，避免多实例重复消费。

#### Scenario: Two workers do not claim the same pending job

- **GIVEN** 两个 worker 实例同时领取任务
- **WHEN** 目标集合中只有一条 `PENDING` 任务
- **THEN** 系统 MUST 仅允许一个 worker 成功领取该任务
- **AND** 另一个 worker MUST 跳过该已锁定任务

### Requirement: Worker 运行形态 MUST 为常驻轮询服务

系统 MUST 使用常驻 worker service 执行任务轮询，不应依赖“定时 HTTP 触发后端执行”的模式。

#### Scenario: Worker continues processing without HTTP trigger endpoint

- **GIVEN** worker service 已启动
- **WHEN** 新任务被写入数据库
- **THEN** worker MUST 在后续轮询周期内自动发现并处理任务
- **AND** 系统 MUST NOT 依赖 `timer + curl` 调用执行接口

## MODIFIED Requirements

### Requirement: Capture ingestion MUST use unified jobs endpoint only

系统 MUST 仅保留 `POST /api/capture/jobs` 作为客户端采集入口；worker 专用领取/处理/完成流程不得通过公开 HTTP 路由暴露。

#### Scenario: Client ingress remains single, worker ingress is internal

- **WHEN** 开发者检查当前 capture API
- **THEN** 客户端采集入口 MUST 仅为 `POST /api/capture/jobs`
- **AND** 系统 MUST NOT 暴露 worker 专用 `claim/process/complete` HTTP 路由
