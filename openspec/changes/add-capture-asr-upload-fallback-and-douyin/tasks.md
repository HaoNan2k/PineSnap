# 任务清单：官方字幕优先 + ASR Upload 回退 + Douyin 来源

## 0. OpenSpec 准备

- 创建并完善 proposal / design / delta spec
- 运行 `openspec validate add-capture-asr-upload-fallback-and-douyin --strict`

## 1. 来源与上下文契约

- 扩展 `CaptureSourceType`：新增 `douyin`
- 扩展 `CaptureContext.providerContext`：新增 `douyin` 专用字段容器
- 扩展来源 scope 映射：支持 `capture:douyin`

## 2. 采集分流策略

- 明确并实现官方字幕优先策略：有官方字幕写 `official_subtitle`
- 明确并实现回退策略：无官方字幕创建 `audio_transcribe` 异步任务
- 前端成功态文案统一为“已收藏”（不暴露技术细分原因）

## 3. ASR Upload 执行链路

- 服务端下载器统一接入 `yt-dlp`（后台 worker 运行，不依赖前端标签页）
- Worker 实现下载候选优先 + `yt-dlp` 回退策略（仅音频流）
- 增加下载保护：超时上限、体积上限、临时文件清理
- 调用 AssemblyAI `POST /v2/upload` 获取 `upload_url`
- 调用 `POST /v2/transcript` 提交任务（`speech_models=["universal-2"]`、`language_detection=true`）
- 轮询 `GET /v2/transcript/{id}` 至终态

## 4. 90 分钟裁剪

- 提交转写时强制区间 `audio_start_from=0`、`audio_end_at=5400000`
- 记录裁剪元信息：`trimmed`、`originalDurationSec`、`processedDurationSec`、`trimRangeMs`
- 前端补充超长提示：超过 90 分钟、可能裁剪

## 5. 结果映射与可观测

- 将 ASR 结果映射到兼容 transcript lines 结构（`startMs/startLabel/text`）
- 优先使用 `utterances` 生成 lines，缺失时回退 `words` 聚合
- 记录 ASR 审计信息：`provider`、`providerRequestId`、`modelRequested`、`modelUsed`、`region`

## 6. 失败语义与重试

- 定义并落地 ASR 失败码（fetch/extract/upload/submit/timeout/transcript_error）
- 配置重试策略与最大重试次数，确保可恢复错误可重试

## 7. 回归验证

- B 站有官方字幕：直接产出 `official_subtitle`
- B 站无官方字幕：自动走 ASR 并产出 `asr_transcript`
- Douyin 来源：可创建任务并进入 ASR 流程
- 超过 90 分钟：仅处理前 90 分钟且记录 `trimmed=true`
- 中英混杂样本：语言检测与 lines 映射可用