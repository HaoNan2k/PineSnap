# 设计：Chrome 扩展全量字幕采集（单主路径执行，AI 面板代码保留）

## 1. 设计原则

- **用户侧权限边界**：平台登录态与内容访问权限留在用户浏览器侧，不将平台账号 cookie 托管到 PineSnap 服务端。
- **协议稳定优先**：既有 payload key、`resourceId` 响应契约、`Resource.content` 存储语义保持不变。
- **渐进增强**：AI 面板代码路径保留，但默认不参与应用层执行链；生产链路只执行全量字幕主路径。
- **单一职责**：扩展侧负责采集与发送；服务端负责鉴权、入库与后续分析，不混杂下载/转码职责。

## 2. 端到端流程

1. 用户在 Chrome 扩展中触发“发送到 PineSnap”。
2. content script 提取视频上下文（如 `bvid/aid/cid/p`）并发起 extractor 策略链。
3. 扩展优先尝试“全量字幕路径”：
   - 从页面嵌入数据读取字幕轨；
   - 或通过字幕相关 API 探测并拿到 `subtitle_url`；
   - 拉取字幕 body，规范化为 `transcript.lines[]`。
4. 组装既有 `VideoCapturePayloadV1`，并 `POST /api/capture/bilibili`。
5. 服务端验证 token 与 payload，创建 `Resource`，返回 `{ ok: true, resourceId }`。

## 3. 客户端结构（扩展）

### 3.1 分层

- `content-script`
  - 页面上下文读取；
  - extractor 编排；
  - 触发发送与用户提示。
- `background/service-worker`
  - 统一网络请求代理（跨域/凭据场景）；
  - 返回文本/JSON 给 content script。
- `shared/extractors`
  - `extractor-full-subtitle`（新）
  - `extractor-ai-assistant-panel`（旧，保留文件，不参与默认调度）
  - `extractor-registry`（策略链）

### 3.2 Extractor Registry 约束

- 每个 extractor MUST 具备唯一 provider id（如 `bilibili_full_subtitle_v1`、`bilibili_ai_assistant_panel`）。
- 每个 extractor MUST 返回统一结果类型（成功/失败、错误码、标准化内容）。
- 策略链在生产默认配置下 MUST 仅执行 `bilibili_full_subtitle_v1`。
- 同一轮采集中 MUST 只产生一个 provider 的最终 payload。

## 4. 数据与兼容性设计

### 4.1 payload 与 key 兼容

- 继续使用既有 `VideoCapturePayloadV1`（`version/metadata/content/summary/transcript` 等 key 不变）。
- 新 extractor 只改变 `provider` 值与内容来源，不改变 key 名称与层级。

### 4.2 `resourceId` 与存储契约

- `POST /api/capture/bilibili` 成功响应继续为 `{ ok: true, resourceId: string }`。
- `resourceId` 语义与生成机制不变（由服务端 `Resource.id` 生成）；本变更不引入新的 id 格式或映射层。
- `Resource.content` 继续原样存完整 payload；不增加必须的新顶层字段。

### 4.3 历史路径保留策略

- 既有 AI 小助手面板 extractor 不删除。
- 旧路径不再作为运行时 fallback 参与默认执行链。
- 如需应急回滚，应通过显式配置开关启用，不允许隐式 fallback。

### 4.4 `cid` 解析与反查策略

- 主来源：页面内嵌状态（`__INITIAL_STATE__` / `__playinfo__`）解析 `bvid/aid/cid/p`。
- 反查兜底：当缺少 `cid` 且存在 `bvid/aid` 时，通过 `x/player/pagelist` 反查当前分 P 对应 `cid`。
- 约束：兜底仅允许“可验证查询”，禁止生成或猜测 `cid`。
- 观测：`captureDiagnostics` 记录 `cidSource`（如 `embedded`/`pagelist_api`）。

## 5. 失败语义与观测

- 统一错误类别：
  - `NO_SUBTITLE_TRACK`
  - `MISSING_VIDEO_CONTEXT`
  - `MISSING_CID`
  - `SUBTITLE_REQUIRES_LOGIN`
  - `SUBTITLE_FETCH_FAILED`
  - `AUTH_FAILED`
  - `UPLOAD_FAILED`
- 结果中 SHOULD 带 extractor provider 与失败码，便于排障与后续策略调优。

## 6. 对现有系统的影响

- **API 契约**：无破坏性变更；新增**可选** `metadata.captureDiagnostics`（`Record<string, unknown>`），用于扩展端可验证性与排障，服务端校验通过后原样写入 `Resource.content`。
- **CORS**：Userscript 仍使用 `Origin: https://www.bilibili.com`（默认 allowlist）。Chrome 扩展由 Service Worker 发起请求时 `Origin` 为 `chrome-extension://<id>`，须在部署环境通过 `CAPTURE_CORS_ALLOWED_ORIGINS` 追加 allowlist（逗号分隔）；否则浏览器会在 CORS 预检阶段拦截，与 Token 无关。
- **B 站凭据策略**：扩展请求 `api.bilibili.com` 的字幕相关 API 时，使用浏览器登录态凭据，以消除“页面已登录但 API 返回匿名态”的不一致。
- **DB Schema**：无变更。
- **Learn/Chat 下游**：继续消费 `Resource.content`，无需迁移；下游应忽略未知字段。
- **部署形态**：新增 Chrome 扩展产物与版本管理流程。

## 7. 开发与验证文档要求

本变更 SHALL 在 `docs/` 中新增专门文档，覆盖以下内容：

- 扩展目录结构与职责（manifest/background/content/options）；
- 本地开发与“加载已解压扩展”流程；
- 环境配置（PineSnap base URL、Capture Token）；
- 发布前验证清单（功能路径、错误路径、兼容性、回归样本）；
- 调试入口（页面 Console、Service Worker Inspect、Network 检查点）。

该文档是任务验收的一部分，不可省略。
