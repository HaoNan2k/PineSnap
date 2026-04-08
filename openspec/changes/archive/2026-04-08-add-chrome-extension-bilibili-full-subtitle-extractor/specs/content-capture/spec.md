# content-capture / spec delta

## ADDED Requirements

### Requirement: Chrome 扩展 SHALL 支持 B 站全量字幕优先采集

系统 SHALL 支持在 Chrome 扩展中执行“一次触发式”采集，优先获取全量字幕并发送至 PineSnap。

#### Scenario: 全量字幕优先路径成功

- Given 用户在 Chrome 扩展中触发“发送到 PineSnap”
- And 扩展可从页面上下文与字幕轨/API 中获取可用字幕 body
- When 扩展构造采集 payload
- Then payload MUST 继续使用既有 `VideoCapturePayloadV1` key 结构
- And `content.transcript.lines` MUST 包含全量或可验证完整度的字幕行集合
- And `content.transcript.provider` MUST 标识当前 extractor（例如 `bilibili_full_subtitle_v1`）

### Requirement: 旧 AI 小助手面板 extractor MUST 保留代码但不参与默认执行链

系统在引入新 extractor 后 MUST 保留既有 AI 小助手面板提取代码路径，但默认不参与应用层采集执行链。

#### Scenario: 默认执行链仅包含全量字幕主路径

- Given 扩展默认运行时配置
- When 扩展执行一次采集
- Then 系统 MUST 仅执行 `bilibili_full_subtitle_v1` 作为主路径
- And 旧 extractor 代码路径 MUST NOT 被删除

### Requirement: Extractor 体系 MUST 可扩展且无冲突

系统 MUST 采用可插拔 extractor 结构，避免重复逻辑、结果冲突与不可观测行为。

#### Scenario: 历史 extractor 并存时的统一编排

- Given 系统同时存在 `bilibili_full_subtitle_v1` 与 `bilibili_ai_assistant_panel` 等 extractor 代码
- When 扩展执行同一轮采集
- Then 编排器 MUST 按默认 provider allowlist 执行 extractor
- And 默认 allowlist MUST 仅包含 `bilibili_full_subtitle_v1`
- And 每个 extractor MUST 使用唯一 provider id，避免语义冲突

### Requirement: Bilibili subtitle API requests MUST use browser login credentials

扩展访问 `api.bilibili.com` 的字幕相关 API 时 MUST 携带浏览器登录态凭据，以避免“网页已登录但 API 视角匿名”导致字幕轨缺失。

#### Scenario: Logged-in user receives subtitle tracks via API

- Given 用户在浏览器中已登录 Bilibili
- When 扩展请求 `x/player/v2` 等字幕相关接口
- Then 请求 MUST 采用可传递登录态凭据的策略
- And 返回中的登录态与字幕轨信息 MUST 与页面登录状态一致

### Requirement: CID resolution MUST support validated fallback lookup

扩展 MUST 先从页面上下文解析 `cid`；若缺失且存在 `bvid/aid`，MUST 通过可验证的 API 反查方式补齐当前分 P 对应 `cid`，不得伪造值。

#### Scenario: Missing embedded cid is resolved via pagelist lookup

- Given 页面内嵌状态缺失 `cid` 但存在 `bvid` 或 `aid`
- When 扩展执行采集前上下文解析
- Then 系统 MUST 通过 pagelist 等可验证 API 反查 `cid`
- And `captureDiagnostics` MUST 记录 `cidSource`

### Requirement: Chrome 扩展开发与验证流程 MUST 文档化

系统 MUST 在 `docs/` 提供可执行的扩展开发与发布前验证文档，确保团队可复现实现与验收过程。

#### Scenario: 团队成员按文档完成本地验证

- Given 开发者按 `docs/` 文档进行扩展本地加载与配置
- When 开发者执行发布前验证清单
- Then 文档 MUST 覆盖“采集成功路径”与“关键失败路径”的验证步骤
- And 文档 MUST 包含调试入口（页面日志、Service Worker 日志、网络请求检查）

### Requirement: Bilibili capture MUST allow extension origins via configured CORS allowlist

当客户端为 Chrome 扩展（Service Worker 发起 `fetch`）时，请求 `Origin` 为 `chrome-extension://<extension-id>`。系统 MUST 支持通过服务端配置（例如环境变量 `CAPTURE_CORS_ALLOWED_ORIGINS`，逗号分隔）将该类 Origin 纳入采集端点 CORS allowlist，以便预检与跨域响应可读。

#### Scenario: Allowlisted chrome-extension origin receives CORS headers

- Given 部署配置将某一 `chrome-extension://` Origin 列入 `CAPTURE_CORS_ALLOWED_ORIGINS`
- When 客户端从该扩展发起对 `POST /api/capture/bilibili` 的跨域请求且 `Origin` 匹配
- Then 响应 MUST 包含与该 `Origin` 匹配的 `access-control-allow-origin`（或与现有 allowlist 规则一致的成功 CORS 语义）

### Requirement: Bilibili capture payload MAY include optional capture diagnostics

`VideoCapturePayloadV1` 的 `metadata` MAY 包含可选字段 `captureDiagnostics`（JSON 对象），用于客户端自检、完整度提示或排障。系统 MUST 在校验通过后将其与其余 `metadata` 一并持久化到 `Resource.content`，不得静默剥离。

#### Scenario: Payload with captureDiagnostics is stored intact

- Given 扩展发送的 payload 在 `metadata.captureDiagnostics` 下包含任意 JSON 兼容键值
- When 请求通过 `POST /api/capture/bilibili` 的 body 校验与鉴权
- Then 服务端 MUST 将 `captureDiagnostics` 作为 `Resource.content.metadata` 的一部分原样保存

## MODIFIED Requirements

### Requirement: Bilibili capture endpoint MUST persist raw payload as Resource

系统 SHALL 在接收到 B 站采集请求后创建 `Resource`，并将完整 payload 以结构化 JSON 形式写入 `Resource.content`（PostgreSQL `jsonb`）。

系统 MUST 保持成功响应契约与标识语义稳定：成功时返回 `{ ok: true, resourceId: string }`，且 `resourceId` 继续对应 `Resource.id`。

#### Scenario: 新旧 extractor 均使用同一持久化与响应契约

- Given 扩展通过任一合法 extractor（新全量字幕或旧 AI 面板）生成 `VideoCapturePayloadV1`
- When 请求通过鉴权并发送至 `POST /api/capture/bilibili`
- Then 服务端 MUST 创建 `Resource` 并原样持久化 payload 到 `Resource.content`
- And 服务端 MUST 返回 `{ ok: true, resourceId: string }`
- And 本流程 MUST NOT 引入新的 resourceId 格式或额外映射字段
