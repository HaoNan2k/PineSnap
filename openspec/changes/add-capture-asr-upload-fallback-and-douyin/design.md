# 设计：官方字幕优先与 ASR Upload 回退

## 1. 总体策略

### 1.1 用户可见策略

- 用户点击采集后，前端成功提示统一为“已收藏”。
- 系统后台继续执行采集与转写流程，不向用户暴露技术细节分支。

### 1.2 内容优先级策略

1. 若来源存在官方字幕：写入 `official_subtitle`（primary）。
2. 若无官方字幕：创建 `audio_transcribe` 异步任务并执行 ASR。
3. 若 ASR 成功：写入 `asr_transcript`（可作为 primary）。

## 2. ASR 输入与执行路径

### 2.1 为什么采用 Upload 路径

第三方媒体链接（B 站/YouTube/抖音）常见签名过期、鉴权限制、时效不稳定。  
因此 ASR 输入统一采用 Upload 路径，避免直接依赖外部 URL 可达性。

### 2.2 下载器选型

- 服务端下载器 MUST 统一使用 `yt-dlp`；
- 下载执行 MUST 在后台 worker 内完成，不依赖扩展页或用户标签页存活；
- `yt-dlp` 作为跨来源统一抽取层，减少来源差异带来的实现分叉。

### 2.3 流程定义

1. Worker 从 `CaptureJob.inputContext.mediaCandidates` 选择音频候选；
2. 若候选为空或不可用，Worker 使用 `yt-dlp` 直接从来源 URL 抽取音频；
3. 下载音频流（仅音频，不下载视频）；
4. 调用 AssemblyAI `POST /v2/upload` 上传二进制；
5. 获取 `upload_url`；
6. 调用 `POST /v2/transcript` 提交转写：
  - `speech_models: ["universal-2"]`
  - `language_detection: true`
  - `audio_start_from: 0`
  - `audio_end_at: 5400000`
7. 轮询 `GET /v2/transcript/{id}` 至终态；
8. 成功后写入 `CaptureArtifact(kind=asr_transcript)`。

### 2.4 下载策略细节

#### 2.4.1 候选与回退顺序

1. 优先使用 `mediaCandidates` 中已提供的音频候选；
2. 候选失败后回退 `yt-dlp` 抽取；
3. 当来源实现了平台专用直连方案（如 B 站 playurl）时，可作为可选回退；
4. 若全部失败，任务进入失败终态并返回可重试错误码。

#### 2.4.2 资源保护与超时

- 单任务下载超时 MUST 设置上限（避免 worker 长时间阻塞）；
- 下载体积 MUST 设置上限（防止异常媒体导致资源耗尽）；
- 下载临时文件 MUST 在成功或失败后清理；
- worker SHOULD 支持候选轮换与指数退避重试。

#### 2.4.3 来源稳定性分级

- `bilibili` 与 `youtube` SHALL 作为主支持来源，默认走 `yt-dlp`；
- `douyin` SHOULD 作为兼容来源，允许更保守的重试与失败策略；
- 不同来源 MAY 使用不同 extractor 参数，但对上层保持统一错误语义。

## 3. 90 分钟裁剪策略

### 3.1 规则

- 系统 MUST 将可处理区间限制为前 90 分钟；
- 超过 90 分钟时，后端仅转写 `[0, 5400000ms]`。

### 3.2 可观测字段

转写结果或诊断信息 SHALL 包含：

- `trimmed: boolean`
- `originalDurationSec: number | null`
- `processedDurationSec: number`
- `trimRangeMs: [number, number]`

## 4. 结果结构兼容

ASR 结果 MUST 映射为现有 transcript 结构：

- `transcript.provider`
- `transcript.language`
- `transcript.lines[]`，每项包含：
  - `startMs`
  - `startLabel`
  - `text`

映射策略：

- 若存在 `utterances`：优先 1 utterance -> 1 line；
- 否则从 `words` 聚合出 line。

## 5. 多模型审计字段

为后续接入 Qwen ASR / gpt-4o-mini，系统 MUST 记录：

- `provider`（如 `assemblyai`）
- `providerRequestId`（如 transcript id）
- `modelRequested`（请求模型列表）
- `modelUsed`（实际模型）
- `endpoint`（调用端点摘要）
- `region`（如 `us` / `eu`）

## 6. 来源扩展：Douyin 一等来源

### 6.1 枚举扩展

- `CaptureSourceType` MUST 新增 `douyin`。
- 权限 scope SHOULD 支持 `capture:douyin`。

### 6.2 上下文字段

- `providerContext.douyin` SHALL 作为来源专用扩展字段容器；
- 推荐字段：`awemeId`、`secUid`（可按实现补充）。

## 7. 错误语义与重试

建议引入或沿用以下错误语义：

- `ASR_AUDIO_FETCH_FAILED`
- `ASR_AUDIO_EXTRACT_FAILED`
- `ASR_UPLOAD_FAILED`
- `ASR_SUBMIT_FAILED`
- `ASR_TIMEOUT`
- `ASR_TRANSCRIPT_ERROR`

其中网络类与上游暂时性错误 SHOULD 允许重试。