# 实施任务

## 1. OpenSpec

- [x] 1.1 完成本 change 的 proposal/design/spec delta
- [x] 1.2 运行 `openspec validate refactor-capture-worker-direct-db-execution --strict`

## 2. 执行面迁移

- [x] 2.1 新增 worker 常驻入口（主循环 + 批处理）
- [x] 2.2 将 worker 执行流程改为 DB 直连领取与回写
- [x] 2.3 将任务领取改为事务化并发安全实现（`FOR UPDATE SKIP LOCKED`）

## 3. 控制面收敛

- [x] 3.1 删除 `/api/capture/jobs/claim` 路由
- [x] 3.2 删除 `/api/capture/jobs/process` 路由
- [x] 3.3 删除 `/api/capture/jobs/[jobId]/complete` 路由
- [ ] 3.4 保留并验证 create/query/retry 路由行为

## 4. 配置与文档

- [x] 4.1 更新 `env.example`：删除 HTTP worker key 触发语义，新增 worker service 配置
- [x] 4.2 提供 worker 启动命令与 systemd service 建议配置

## 5. 验证

- [ ] 5.1 本地类型检查/构建通过
- [ ] 5.2 创建 `audio_transcribe` 任务后，worker 可完成转写并落 `asr_transcript`
- [ ] 5.3 失败任务可通过 retry API 重入并再次被 worker 消费
