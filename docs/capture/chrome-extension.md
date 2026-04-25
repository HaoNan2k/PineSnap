# Chrome 扩展开发与验证（B 站采集）

本文是 B 站采集扩展的开发与联调手册，基于当前统一入口：`POST /api/capture/jobs`。

## 1. 当前契约（必须对齐）

### 1.1 上传入口

- URL: `POST /api/capture/jobs`
- 鉴权: `Authorization: Bearer <CaptureToken>`
- 响应: `{ ok, resourceId, jobId, status, idempotent }`

### 1.2 请求体核心结构

```json
{
  "captureContext": {
    "schemaVersion": 1,
    "sourceType": "bilibili",
    "sourceUrl": "https://www.bilibili.com/video/BV...",
    "captureRequestId": "dedupe-key",
    "capturedAt": "2026-01-01T00:00:00.000Z",
    "providerContext": {
      "bilibili": { "bvid": "BV..." }
    }
  },
  "title": "B站：xxx",
  "thumbnailUrl": "https://i0.hdslb.com/...",
  "artifact": {
    "kind": "official_subtitle",
    "format": "cue_lines",
    "content": { "language": "zh", "lines": [] },
    "isPrimary": true
  }
}
```

说明：

- `thumbnailUrl` 用于 Resource 列表封面展示（URL 方案）。
- 正文内容必须放在 `artifact.content`，不是 Resource 元信息。

## 2. 扩展与服务端职责边界

### 2.1 扩展侧

- 负责采集页面上下文和字幕内容。
- 生成稳定的 `captureRequestId`（同一采集请求重复提交不应重复建 job）。
- 通过后台脚本统一发请求（避免 content script 直接跨域）。

### 2.2 服务端

- 负责 token 校验、scope 校验、幂等落库。
- 负责 Resource/Job/Artifact 三层持久化。
- 负责状态机、重试和主产物切换。

## 3. Manifest 与运行方式（最小集）

- Manifest V3
- `permissions`: `storage`, `identity`
- `background.service_worker`: `background.js`
- `content_scripts.matches`: `https://www.bilibili.com/video/*`
- `options_page`: 配置 Base URL + 发起连接

## 4. CORS 必配

扩展请求会携带 `Origin: chrome-extension://<extension-id>`，服务端必须在 allowlist 放行：

- 环境变量：`CAPTURE_CORS_ALLOWED_ORIGINS`
- 示例：`chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef`

扩展 ID 变更后必须同步更新 allowlist。

## 5. 调试入口

- 页面日志：B 站页 DevTools Console
- 后台日志：`chrome://extensions` -> Service Worker -> Inspect
- 网络日志：观察 `api.bilibili.com` 与 PineSnap `api/capture/jobs`

## 6. 发布前回归清单

### 成功路径

- 单 P 视频：返回 `resourceId + jobId`
- 多 P 视频：切换 `?p=` 仍采集正确
- 有封面时 `thumbnailUrl` 入库成功

### 失败路径

- 无字幕：明确错误提示
- token 失效（401/403）：引导重新连接
- 网络或 5xx：可重试提示

### 数据核对

- Resource 包含 `sourceType/title/canonicalUrl/thumbnailUrl`
- Job 按 `resourceId + captureRequestId` 幂等
- Artifact 产生 primary 内容并可被列表/学习读取

