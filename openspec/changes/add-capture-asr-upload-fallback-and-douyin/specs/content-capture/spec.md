# content-capture / spec delta

## ADDED Requirements

### Requirement: 系统 MUST 采用“官方字幕优先，ASR 回退”的统一策略

系统 MUST 在同一来源下优先使用官方字幕产物；当官方字幕不可用时，系统 MUST 自动回退到 `audio_transcribe` 异步任务。

#### Scenario: Official subtitle is used when available

- **GIVEN** 来源存在可用官方字幕轨
- **WHEN** 用户触发采集
- **THEN** 系统 MUST 写入 `official_subtitle` 产物
- **AND** 系统 MUST NOT 额外触发 ASR 回退任务

#### Scenario: ASR fallback is created when official subtitle is unavailable

- **GIVEN** 来源不存在可用官方字幕轨
- **WHEN** 用户触发采集
- **THEN** 系统 MUST 创建 `jobType=audio_transcribe` 的异步任务
- **AND** 系统 MUST 在后台执行 ASR 流程

### Requirement: ASR 音频输入 MUST 使用 Upload 流程

系统 MUST 通过上传音频文件生成供应商内部可访问 URL，再提交转写任务，不可直接依赖不稳定的第三方媒体链接。

#### Scenario: Worker submits transcript using provider upload URL

- **GIVEN** Worker 已获取来源音频流
- **WHEN** Worker 执行 ASR
- **THEN** Worker MUST 先调用上传接口获取 `upload_url`
- **AND** Worker MUST 使用该 `upload_url` 调用转写接口

### Requirement: 服务端音频下载 MUST 使用 yt-dlp 并独立于前端标签页

系统 MUST 使用 `yt-dlp` 作为跨来源音频下载器，并在后台 worker 独立执行下载，不得依赖用户标签页保持打开。

#### Scenario: Download proceeds after user closes tab

- **GIVEN** 用户已触发采集并成功创建后台任务
- **WHEN** 用户关闭来源页面标签页
- **THEN** 后台 worker MUST 仍可继续执行音频下载与后续转写

### Requirement: 下载流程 MUST 支持候选优先与回退策略

系统 MUST 优先尝试 `mediaCandidates`，候选不可用时 MUST 回退到 `yt-dlp` 直接抽取。

#### Scenario: Worker falls back to yt-dlp when candidate URL expires

- **GIVEN** `mediaCandidates` 中首个音频 URL 已过期或不可达
- **WHEN** worker 尝试下载失败
- **THEN** worker MUST 按策略尝试下一候选或回退 `yt-dlp` 抽取
- **AND** 不得直接结束任务为不可恢复失败

### Requirement: 下载执行 MUST 具备资源保护机制

系统 MUST 为音频下载配置超时、体积上限与临时文件清理机制，防止后台任务阻塞和资源泄漏。

#### Scenario: Oversized media is stopped by guardrails

- **GIVEN** 来源媒体超过系统允许的下载体积上限
- **WHEN** worker 执行下载
- **THEN** worker MUST 终止下载并返回明确错误语义
- **AND** worker MUST 清理已生成的临时文件

### Requirement: ASR 转写 MUST 限制在前 90 分钟并记录裁剪信息

系统 MUST 将转写处理窗口限制为前 90 分钟，并将裁剪行为写入可观测字段。

#### Scenario: Long media is trimmed to first 90 minutes

- **GIVEN** 音频时长超过 90 分钟
- **WHEN** 系统提交 ASR 转写请求
- **THEN** 请求 MUST 仅覆盖前 90 分钟音频区间
- **AND** 结果元信息 MUST 标记 `trimmed=true`

### Requirement: ASR 结果 MUST 与 transcript lines 结构兼容

系统 MUST 将 ASR 结果映射为统一 transcript 结构，至少包含 `provider`、`language`、`lines[]`，其中每条 line 含 `startMs/startLabel/text`。

#### Scenario: Utterances are mapped to transcript lines

- **GIVEN** ASR 返回包含 `utterances`
- **WHEN** 系统构建入库内容
- **THEN** 系统 SHOULD 按 utterance 粒度生成 `lines[]`
- **AND** 每条 line MUST 包含时间戳与文本

### Requirement: 系统 MUST 记录 ASR 模型审计信息

系统 MUST 记录请求模型列表与实际使用模型，以支持多供应商并行评估与排障。

#### Scenario: Model requested and model used are both persisted

- **GIVEN** 系统提交 ASR 请求
- **WHEN** 请求完成并回写结果
- **THEN** 系统 MUST 记录 `modelRequested`
- **AND** 系统 MUST 记录 `modelUsed`

### Requirement: CaptureContext MUST 支持 douyin 一等来源

系统 MUST 扩展来源类型以支持 `douyin`，并支持 `providerContext.douyin` 承载来源专用字段。

#### Scenario: Douyin source is accepted by unified jobs endpoint

- **GIVEN** 客户端提交 `sourceType=douyin` 的采集请求
- **WHEN** 请求体字段合法且鉴权通过
- **THEN** 统一 jobs 入口 MUST 接受并创建任务
- **AND** 系统 MUST 允许写入 `providerContext.douyin`

## MODIFIED Requirements

### Requirement: CaptureContext 契约 MUST 支持多来源并可扩展

系统 MUST 定义统一 `CaptureContext` 输入结构，支持来源集合至少包含：`bilibili`、`wechat_article`、`web_page`、`youtube`、`xiaohongshu`、`douyin`。

#### Scenario: Douyin is included in supported source set

- **WHEN** 系统校验 `CaptureContext.sourceType`
- **THEN** 系统 MUST 将 `douyin` 视为合法来源类型