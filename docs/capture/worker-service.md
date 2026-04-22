# Capture Worker Service (Direct DB)

本项目的 capture worker 采用“常驻进程 + 直连数据库”模式，不再通过 HTTP 调用 Vercel 执行任务。

## 启动命令

```bash
pnpm worker:run
```

## 必要环境变量

- `DATABASE_URL`
- `ASSEMBLYAI_API_KEY`
- `WORKER_POLL_INTERVAL_MS`（可选，默认 10000）
- `WORKER_BATCH_SIZE`（可选，默认 3）
- `CAPTURE_WORKER_SOURCE_TYPE`（可选）
- `CAPTURE_YTDLP_BIN` / `CAPTURE_YTDLP_COOKIES_PATH`（按需）
- `CAPTURE_AUDIO_DOWNLOAD_TIMEOUT_MS` / `CAPTURE_AUDIO_MAX_BYTES` / `CAPTURE_YTDLP_TIMEOUT_MS`（按需）

## systemd 示例

```ini
[Unit]
Description=PineSnap Capture Worker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/pinesnap
EnvironmentFile=/etc/pinesnap/worker-staging.env
ExecStart=/usr/bin/env pnpm worker:run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 迁移后注意

- 不再需要 `pinesnap-worker-staging.timer`。
- 不再需要 `run-worker-trigger.sh` 通过 curl 调 `/api/capture/jobs/process`。
- worker 只消费数据库中的 `PENDING + audio_transcribe` 任务。
