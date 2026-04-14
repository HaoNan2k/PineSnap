# 提案：官方字幕优先 + ASR Upload 回退 + Douyin 一等来源

## 背景

当前 B 站采集链路已经支持“扩展优先抓官方字幕并通过统一 jobs 入口入库”。  
但在用户体验与后端可扩展性上仍有缺口：

- 当官方字幕不可用时，用户侧会感知为“没有结果”；
- ASR 回退路径尚未明确为稳定的 Upload 方案；
- 采集来源尚未将 Douyin 作为一等 `sourceType`；
- 后续计划引入多 ASR 供应商（如 Qwen ASR / gpt-4o-mini），需要统一记录“请求模型与实际模型”。

产品侧已明确目标：

- 点击后用户只看到“已收藏”，不暴露底层技术分支；
- 优先官方字幕，无官方字幕时自动回退 ASR；
- 最大处理时长 90 分钟，超过部分仅处理前 90 分钟。

## 本次目标

1. 明确“官方字幕优先，ASR 自动回退”的统一策略。
2. 明确 ASR 音频输入采用 `upload -> upload_url -> transcript` 的稳定路径。
3. 明确 ASR 结果与现有 transcript lines 结构兼容。
4. 新增 `douyin` 作为一等采集来源。
5. 为多 ASR 供应商演进建立统一审计字段（模型请求/实际使用/请求标识）。

## 非目标

- 本次不引入说话人识别（diarization）为默认能力；
- 本次不实现视频下载转写（仅音频流）；
- 本次不在用户界面暴露“无字幕/拉取失败”等技术细分原因。

## 决策清单

### 本次沿用的既有决策

- 采集入口统一为 `POST /api/capture/jobs`；
- 客户端点击后可异步后台处理；
- `CaptureJob` 作为状态真相源，`CaptureArtifact` 作为内容真相源；
- 自动语言检测作为默认策略。

### 本次新增/变更决策

- 用户点击采集后，前端成功态文案统一为“已收藏”；
- B 站采集策略 SHALL 采用“有官方字幕则写 `official_subtitle`，否则创建 `audio_transcribe` 异步任务”；
- 服务端音频下载器 MUST 统一采用 `yt-dlp`，禁止依赖前端标签页持续在线；
- ASR 输入 MUST 采用 AssemblyAI Upload 流程：`POST /v2/upload` 后使用返回 `upload_url` 调 `POST /v2/transcript`；
- ASR 转写 MUST 仅处理前 90 分钟（`audio_start_from=0`，`audio_end_at=5400000`）；
- 结果中 MUST 记录 `trimmed`（是否发生裁剪）及处理时长信息；
- 系统 MUST 记录 `modelRequested` 与 `modelUsed`，用于后续多供应商对比；
- `CaptureSourceType` MUST 新增 `douyin`，并支持 `providerContext.douyin`。

## 预期收益

- 用户端心智更简单：点一次即“已收藏”，结果后台补齐；
- 官方字幕与 ASR 路径衔接稳定，显著提升“最终可用内容”产出率；
- 为后续 Qwen ASR / gpt-4o-mini 等并行接入提供统一可观测性基础；
- 采集来源模型更完整，支持 Douyin 一等扩展。