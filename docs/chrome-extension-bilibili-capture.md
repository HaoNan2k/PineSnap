# Chrome 扩展开发与发布前验证（B 站采集）

本文用于指导 PineSnap 的 B 站采集 Chrome 扩展开发、调试与发布前验证。

> 目标：在不依赖 AI 小助手面板的前提下，优先抓取全量字幕并发送到 PineSnap，且保持既有 payload 与 `resourceId` 响应契约不变。

## 1. 开发范围

- 平台：Chrome（Manifest V3）
- 采集对象：`https://www.bilibili.com/video/*`
- 发送端点：`POST /api/capture/bilibili`
- 鉴权：扩展授权握手自动签发 `CaptureToken`（用户无需手工复制）
- 存储目标：`Resource.content`（服务端原样入库）

## 2. 目录结构

仓库已提供一个最小可运行骨架：`extensions/chrome-bilibili-capture/`。

```text
extensions/chrome-bilibili-capture/
  manifest.json
  background.js
  content.js
  options.html
  options.js
  popup.html            (可选)
  popup.js              (可选)
  shared/
    extractor-registry.js
    extractors/
      bilibili-full-subtitle.js
      bilibili-ai-assistant-panel.js
```

### 2.1 Manifest V3（`manifest.json`）最小字段清单

以下为 B 站采集扩展**起步所需**字段；实际键名以 Chrome 文档为准，发布前再按商店审核要求补全说明与隐私政策链接。

| 字段 | 作用 | 建议值 / 说明 |
|------|------|----------------|
| `manifest_version` | 必须为 MV3 | `3` |
| `name` / `version` / `description` | 扩展元信息 | 与仓库版本号对齐，便于排障 |
| `permissions` | 扩展能力 | 至少 `storage`、`identity`（用于扩展授权回跳） |
| `host_permissions` | 跨站网络访问声明 | 必须覆盖 B 站页面、字幕/API、CDN；若 Base URL 可配置，则需覆盖 PineSnap 目标域名集合 |
| `background` | Service Worker | `service_worker` 指向 `background.js`（统一代理 `fetch`） |
| `content_scripts` | 页面注入 | `matches` 含 `https://www.bilibili.com/video/*`（可按需扩到 `bangumi` 等）；`js` 含 `content.js`；`run_at` 常用 `document_idle` 或 `document_start`（与首屏 DOM 需求权衡） |
| `action` | 工具栏图标 | 可选；用于打开 `popup` 或触发说明 |
| `options_page` 或 `options_ui` | 配置页 | 用于 Base URL、发起连接、查看连接状态 |
| `icons` | 商店与工具栏 | 至少提供 16/48/128（上架时常要求） |

**`host_permissions` 典型覆盖（按实际域名微调）：**

- `https://*/*` — 当前仓库骨架使用宽权限以支持“用户可配置 PineSnap Base URL”；若准备发布商店，可按部署域名收敛
- `http://localhost/*` — 本地开发调试

**最小骨架示例（占位符需替换）：**

```json
{
  "manifest_version": 3,
  "name": "PineSnap Bilibili Capture",
  "version": "0.1.0",
  "description": "将 B 站视频字幕采集至 PineSnap。",
  "permissions": ["storage", "identity"],
  "host_permissions": [
    "https://*/*",
    "http://localhost/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.bilibili.com/video/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**说明：**

- 若 content script 与 background 需双向通信，使用 `chrome.runtime.sendMessage` / `onMessage`，无需额外 permission。
- 若仅向 PineSnap 发 JSON，可在 background 里 `fetch`，避免在页面上下文直接碰 CORS。
- 上架 Chrome Web Store 时通常还需：`homepage_url`、隐私政策 URL、权限理由说明；这些可在 MVP 之后再补。

## 3. 关键实现要点

### 3.1 Extractor 策略链

- 主路径：`bilibili-full-subtitle`
  - 提取页面上下文（`bvid/aid/cid/p`）
  - `cid` 缺失时通过 `pagelist` API 做可验证反查（禁止伪造）
  - 发现字幕轨（内嵌数据或字幕 API）
  - 拉取字幕 body（`from/to/content`）并规范化为 `transcript.lines[]`
- 运行策略：
  - 默认仅执行主路径 provider（`bilibili_full_subtitle_v1`）
  - AI 面板 extractor 代码保留但不参与默认调度
  - 每轮采集只采用一个 provider 的结果

### 3.2 数据契约（必须保持兼容）

- payload key 继续使用既有 `VideoCapturePayloadV1` 结构
- 成功响应继续为 `{ ok: true, resourceId: string }`
- 不引入新 `resourceId` 格式

### 3.3 扩展授权握手（零手动）

- 扩展在 `options` 页点击“连接 PineSnap”
- `background.js` 发起 `chrome.identity.launchWebAuthFlow`
- PineSnap 授权页确认后，服务端回跳扩展并通过一次性 code 兑换 token
- 扩展将 token 存入 `chrome.storage.local`，后续采集自动携带

### 3.4 后台请求代理

- `content.js` 通过 `chrome.runtime.sendMessage` 请求 `background.js`
- `background.js` 统一执行跨域 fetch 与上传请求
- 对 `api.bilibili.com` 字幕相关请求携带浏览器登录态凭据，避免“页面已登录但 API 视角匿名”
- 返回 JSON 给 `content.js` 做标准化处理

### 3.5 PineSnap 服务端 CORS（扩展必配）

由 Service Worker 向 PineSnap 发 `POST /api/capture/bilibili` 时，浏览器会带上 `Origin: chrome-extension://<扩展ID>`。服务端仅在 **allowlist** 内的 Origin 会返回 `Access-Control-Allow-Origin`，否则扩展侧会看到 CORS 错误（与 Token 是否正确无关）。

- 在 PineSnap 部署环境设置环境变量 `CAPTURE_CORS_ALLOWED_ORIGINS`（逗号分隔多个 Origin）。
- 每次「加载已解压的扩展」若扩展 ID 变化，需同步更新该列表中的 `chrome-extension://...` 项。
- 若仍保留 legacy userscript 路径，其 `Origin` 仍可使用默认 `https://www.bilibili.com`。

### 3.6 可选 `metadata.captureDiagnostics`（可验证性 / 排障）

服务端仅对已声明字段入库；若要把自检信息一并持久化，请使用约定键 `metadata.captureDiagnostics`（值为任意 JSON 对象，如 `provider`、`lineCount`、字幕轨 id、失败码、拉取时间戳等）。该字段可选；不传则行为与旧版完全一致。

## 4. 本地加载与开发调试

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择扩展目录（如 `extensions/chrome-bilibili-capture/`）
5. 打开 B 站视频页进行测试

默认内容脚本会在视频页左侧挂载“存入 PineSnap”按钮，点击后执行 extractor 策略链并上传。

### 4.1 配置项

- PineSnap Base URL
- 连接按钮（自动授权，不手填 token）

建议在 `options` 页面先保存 Base URL，再点击“连接 PineSnap”完成授权。

### 4.2 调试入口

- 页面日志：B 站页面 DevTools Console
- 扩展后台日志：`chrome://extensions` -> 目标扩展 -> Service Worker -> Inspect
- 网络日志：DevTools Network（检查 `api.bilibili.com` 与 PineSnap 端点请求）

## 5. 发布前验证清单（必须执行）

### 5.1 成功路径

- [ ] 单 P 且有字幕视频：采集成功并返回 `resourceId`
- [ ] 多 P 视频：切换 `?p=` 后仍能采集到对应字幕
- [ ] provider 记录正确（命中主路径时为新 extractor）

### 5.2 失败路径

- [ ] 无字幕视频：给出明确提示（非静默失败）
- [ ] 登录态受限字幕：返回明确错误（如 `SUBTITLE_REQUIRES_LOGIN`）并引导用户确认 B 站登录态
- [ ] Token 失效（401/403）：给出“重新连接”提示并可一键跳转 options
- [ ] 服务端异常（5xx）：给出发送失败提示
- [ ] 网络异常：给出可重试提示

### 5.3 契约与入库检查

- [ ] 请求体 key 与既有 `VideoCapturePayloadV1` 一致
- [ ] 响应仍为 `{ ok: true, resourceId: string }`
- [ ] 服务端 `Resource.content` 为完整 payload 原样入库

## 6. 上架前建议

- 先进行“本地加载 + 小范围内测”，不强制立即上架商店
- 补充权限说明与隐私说明（为什么需要 host permissions）
- 至少完成 2 轮完整回归后再考虑 Chrome Web Store 发布

## 7. 数据库变更（P0）

P0 为“扩展零手动连接”新增了一张一次性授权码表，用于授权码交换，不改变既有资源入库结构。

### 7.1 新增模型

- `CaptureAuthCode`（Prisma 模型）
  - `id`: 主键
  - `userId`: 归属用户
  - `codeHash`: 授权码哈希（唯一）
  - `codeChallenge`: PKCE challenge
  - `state`: 防 CSRF 状态参数
  - `redirectUri`: 扩展回调地址（`https://<extension-id>.chromiumapp.org/...`）
  - `expiresAt`: 过期时间
  - `consumedAt`: 单次消费时间戳
  - `createdAt`: 创建时间

### 7.2 迁移文件

- `prisma/migrations/20260406153000_add_capture_auth_codes/migration.sql`

该迁移会执行：
- `CREATE TABLE "CaptureAuthCode" (...)`
- 唯一索引：`CaptureAuthCode_codeHash_key`
- 普通索引：`CaptureAuthCode_userId_idx`、`CaptureAuthCode_expiresAt_idx`

### 7.3 兼容性说明

- **无破坏性变更**：`CaptureToken`、`Resource` 结构不变。
- 采集响应契约保持：`{ ok: true, resourceId: string }`。
- `Resource.content` 写入语义不变，继续原样存储 payload。

## 8. 环境变量配置（必配/可选）

以下变量已经在 `env.example` 给出；这里补充“怎么配”和“配成什么”。

### 8.1 必配（扩展联调最小集）

1) `CAPTURE_CORS_ALLOWED_ORIGINS`

- 作用：允许扩展 Service Worker 跨域调用 PineSnap。
- 值：`chrome-extension://<你的扩展ID>`（多个值用逗号分隔）。
- 示例：

```dotenv
CAPTURE_CORS_ALLOWED_ORIGINS="chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef"
```

2) `DATABASE_URL` / `DIRECT_URL`

- 作用：Prisma 运行与迁移。
- 说明：生产建议带 `sslmode=require`。

3) Supabase 相关变量（如果你在用 Supabase Auth）

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 8.2 推荐配置（扩展优先产品路径）

1) `CAPTURE_ENABLE_USERSCRIPT_LEGACY`

- 作用：控制旧 userscript 入口是否展示/可用。
- 推荐：`false`（扩展优先，默认关闭 legacy）。

```dotenv
CAPTURE_ENABLE_USERSCRIPT_LEGACY="false"
```

2) `NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL`

- 作用：`/connect/bilibili` 页面“安装扩展”按钮跳转地址。
- 推荐：线上环境配置为正式商店 URL；本地可留空或填临时页面。

```dotenv
NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL="https://chromewebstore.google.com/detail/<your-extension-id>"
```

### 8.3 本地开发示例

```dotenv
CAPTURE_CORS_ALLOWED_ORIGINS="chrome-extension://abcdefghijklmnopqrstuvwxyzabcdef"
CAPTURE_ENABLE_USERSCRIPT_LEGACY="false"
NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL=""
```

### 8.4 生产环境示例

```dotenv
CAPTURE_CORS_ALLOWED_ORIGINS="chrome-extension://prodextensionidxxxxxxxxxxxxxxxx"
CAPTURE_ENABLE_USERSCRIPT_LEGACY="false"
NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL="https://chromewebstore.google.com/detail/<your-extension-id>"
```

### 8.5 配置后的检查顺序

1. 执行数据库迁移（`prisma migrate deploy`）。
2. 重启应用服务使新 env 生效。
3. 在 Chrome 重新加载扩展，确认扩展 ID 与 CORS allowlist 一致。
4. 走一遍连接流程：扩展“连接 PineSnap” -> 网页授权 -> 回跳扩展。
5. 在 B 站页面点击“存入 PineSnap”验证入库成功。
