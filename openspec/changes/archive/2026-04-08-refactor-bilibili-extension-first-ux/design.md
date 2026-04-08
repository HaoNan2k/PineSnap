# 设计：P0 扩展优先连接与零手动鉴权

## 1. 设计原则

- 用户优先：主流程不要求手动复制 token、不要求理解油猴。
- 服务端为真相源：授权、scope、签发、撤销均由服务端控制。
- 契约稳定：`/api/capture/bilibili` 请求/响应与落库语义保持兼容。
- 安全默认：采用一次性授权码与短时效校验，避免长期暴露凭据。

## 2. 目标用户流程（P0）

1. 用户安装 Chrome 扩展。
2. 用户在扩展页点击“连接 PineSnap”。
3. 扩展打开 PineSnap 授权页（复用现有登录态；未登录则先登录）。
4. 用户点击“授权此扩展”，服务端生成一次性授权码并回跳扩展。
5. 扩展用授权码交换 `capture:bilibili` token，保存到本地安全存储。
6. 用户在 B 站页面点击“存入 PineSnap”完成采集。

## 3. 系统流程设计

### 3.1 授权发起与确认

- 扩展生成 `codeVerifier`/`codeChallenge` 与 `state`。
- 扩展打开授权页（包含扩展回调地址、`state`、`codeChallenge` 等参数）。
- 授权页校验登录态并展示确认按钮。

### 3.2 授权码签发

- 用户确认后，服务端签发一次性 `authCode`（短 TTL，单次消费）。
- 服务端将用户重定向回扩展回调地址并附带 `code` 与 `state`。

### 3.3 授权码交换 token

- 扩展校验 `state` 后调用交换端点，提交 `code` + `codeVerifier`。
- 服务端校验授权码状态、TTL 与 challenge，成功后签发 scope 为 `capture:bilibili` 的 Capture Token。
- 扩展持久化 `{ baseUrl, token, tokenId, connectedAt }`。

## 4. 数据与接口

### 4.1 数据模型（新增）

新增短期授权码存储（例如 `CaptureAuthCode`）：

- `id`
- `userId`
- `codeHash`
- `codeChallenge`
- `redirectUri`
- `expiresAt`
- `consumedAt`
- `createdAt`

该模型仅用于扩展连接握手，不改变既有 `CaptureToken` 模型。

### 4.2 接口（P0）

- 授权确认页：`GET /connect/bilibili/authorize`
- 授权码签发：`POST /api/capture/extension/authorize`
- 授权码交换：`POST /api/capture/extension/exchange`

说明：以上接口为本 change 的目标契约，具体参数字段在实现阶段以类型定义落地。

## 5. 兼容与回滚

- `install.user.js` 路径进入 deprecated，默认不在 UI 展示。
- 增加 legacy 开关（例如 `CAPTURE_ENABLE_USERSCRIPT_LEGACY`），仅在应急时恢复旧入口。
- 保留旧 token 撤销能力，避免并行连接导致权限面扩大。

## 6. 风险与缓解

- 授权跳转失败：在扩展和网页两侧提供重试入口与错误码提示。
- 扩展 ID 与 CORS 配置不一致：文档强制要求部署配置 `CAPTURE_CORS_ALLOWED_ORIGINS`。
- 连接过期/撤销：扩展捕获 401/403 后引导用户一键重连。

## 7. 验收标准（P0）

- 新用户无需手工填 token 即可完成连接。
- 连接后可在 B 站页面成功写入一条 `bilibili_capture` 资源。
- 旧 userscript 默认不出现在主流程，但可通过开关回滚。
