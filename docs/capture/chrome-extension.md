# Chrome 扩展开发与验证（多源）

PineSnap Capture 扩展的开发与联调手册。统一入口：`POST /api/capture/jobs`。

支持的源（按 SITE_ADAPTERS 顺序匹配，未命中走通用兜底）：

| Provider | URL 形态 | Artifact kind | 备注 |
|----------|---------|---------------|------|
| `bilibili_full_subtitle_v1` | `bilibili.com/video/*` | `official_subtitle` / 失败时 ASR fallback | 视频型 |
| `youtube_subtitle_v1` | `youtube.com/watch*` | `official_subtitle` | 视频型 |
| `wechat_article_v1` | `mp.weixin.qq.com/s*` | `extracted_text + format=markdown` | 文章型 |
| `zhihu_answer_v1` | `zhihu.com/question/*/answer/*`、`zhuanlan.zhihu.com/p/*` | `extracted_text + format=markdown` | 文章型 |
| `generic_article_v1` | 任意 URL（兜底） | `extracted_text + format=markdown` | Defuddle 通用抽取 |

## 1. 当前契约（必须对齐）

### 1.1 上传入口

- URL：`POST /api/capture/jobs`
- 鉴权：`Authorization: Bearer <CaptureToken>`，需有 `capture:*` 通配符 scope（新版扩展默认拿到）
- 响应：`{ ok, resourceId, jobId, status, idempotent }`
- CORS：`CAPTURE_CORS_ALLOWED_ORIGINS` 必须包含 `chrome-extension://<扩展ID>`

### 1.2 请求体（视频型示例 — bilibili）

```json
{
  "captureContext": {
    "schemaVersion": 1,
    "sourceType": "bilibili",
    "sourceUrl": "https://www.bilibili.com/video/BV...",
    "captureRequestId": "dedupe-key-32-chars",
    "capturedAt": "2026-04-25T00:00:00.000Z",
    "providerContext": { "bilibili": { "bvid": "BV..." } }
  },
  "title": "B站：xxx",
  "thumbnailUrl": "https://i0.hdslb.com/...",
  "artifact": {
    "kind": "official_subtitle",
    "format": "cue_lines",
    "content": { "transcript": { "language": "zh", "lines": [] } },
    "isPrimary": true
  }
}
```

### 1.3 请求体（文章型示例 — 公众号 / 知乎 / 通用）

```json
{
  "captureContext": {
    "schemaVersion": 1,
    "sourceType": "web_page",
    "sourceUrl": "https://mp.weixin.qq.com/s/...",
    "captureRequestId": "dedupe-key-32-chars",
    "capturedAt": "2026-04-25T00:00:00.000Z",
    "providerContext": {
      "webPage": {
        "titleHint": "文章标题",
        "extractor": "wechat_article_v1"
      }
    }
  },
  "title": "文章标题",
  "thumbnailUrl": "https://mmbiz.qpic.cn/cover.jpg",
  "artifact": {
    "kind": "extracted_text",
    "format": "markdown",
    "content": {
      "markdown": "# 文章标题\n\n正文...",
      "title": "文章标题",
      "author": "公众号名",
      "publishedAt": "2026-04-25",
      "cover": "https://mmbiz.qpic.cn/cover.jpg",
      "sourceHtml": "<html>...</html>",
      "wordCount": 1234
    },
    "isPrimary": true
  }
}
```

### 1.4 请求体（视频字幕失败 → ASR fallback）

```json
{
  "captureContext": {
    "schemaVersion": 1,
    "sourceType": "bilibili",
    "sourceUrl": "...",
    "captureRequestId": "...",
    "capturedAt": "...",
    "mediaCandidates": [
      { "kind": "audio", "url": "https://...m4a", "mimeType": "audio/mp4", "bitrateKbps": 128 }
    ],
    "accessContext": { "referer": "https://www.bilibili.com/", "userAgent": "..." }
  },
  "jobType": "audio_transcribe"
}
```

无 `artifact` 字段时服务端把 job 推到队列，worker 消费后跑 AssemblyAI 转写。

## 2. 扩展架构

```
┌─────────────────────────────────────────────────────────────────┐
│  manifest.json (matches: <all_urls>)                            │
│    │ 注入顺序                                                    │
│    ├── dist/defuddle.bundle.js          ← Defuddle bundled IIFE │
│    ├── shared/runtime.js                ← 通用工具（toast/sleep）│
│    ├── shared/extractors/lib/dom-cleanup.js                     │
│    ├── shared/extractors/bilibili-full-subtitle.js              │
│    ├── shared/extractors/generic-article.js                     │
│    ├── shared/extractors/wechat-article.js                      │
│    ├── shared/extractors/zhihu-answer.js                        │
│    ├── shared/extractors/youtube-subtitle.js                    │
│    ├── shared/extractor-registry.js     ← URL 路由 + 错误码      │
│    └── content.js                       ← 入口按钮 + 调度        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Extractor 契约

每个 extractor 在自己的 IIFE 里向 `globalThis.PineSnapCapture.extractors[provider]` 注册：

```js
{
  provider: "extractor_v1",
  matches: (url) => boolean,        // URL 是否归属此 extractor
  extract: async (ctx) => Result,   // 实际抽取
  _internals: { ... }               // 可选，给 content.js / 测试用
}
```

`extract(ctx)` 输入 `{ url, document, fetchJson }`，返回：
- 成功：`{ ok: true, provider, payload }`
- 失败：`{ ok: false, provider, code, diagnostics, meta? }`

### 2.2 Registry 路由

`shared/extractor-registry.js` 定义 `SITE_ADAPTERS` 数组（顺序即优先级），URL 命中即用，未命中 fallback 到 `generic_article_v1`。

错误码与 fallback 分类集中在 `ERROR_CODES` 常量与 `isFallbackable(code)`。content.js 不内联 switch 判断。

## 3. 扩展与服务端职责边界

### 扩展侧
- URL 路由 → 选 extractor → 执行抽取
- Defuddle 在浏览器上下文跑，能拿到已渲染 DOM + 用户登录态
- 构造完整 payload（含 sourceType / providerContext / artifact）
- 通过 background script 跨域调用 fetch

### 服务端侧
- token 校验、scope 校验、CORS、幂等落库
- Resource / CaptureJob / CaptureArtifact 三层持久化
- 状态机、重试、主产物切换
- 视频型 ASR fallback：worker 消费 `audio_transcribe` 队列

## 4. CORS 必配

```bash
# .env.local（开发）或 Vercel 环境变量（生产）
CAPTURE_CORS_ALLOWED_ORIGINS=chrome-extension://<扩展ID1>,chrome-extension://<扩展ID2>
```

扩展 ID 变更（重命名扩展、Chrome 商店发布等）后必须同步更新。

## 5. 调试入口

| 排查目标 | 看哪 |
|---------|------|
| 页面 / extractor 行为 | 当前页 DevTools Console（content.js 日志） |
| 后台 fetch / token | `chrome://extensions/` → 找扩展 → "Service Worker" → Inspect |
| 网络请求 | DevTools Network 面板，看 `/api/capture/jobs` |
| 服务端落库 | Supabase Dashboard → Table Editor → Resource / CaptureJob / CaptureArtifact |

## 6. 发布前回归清单

### 视频型（bilibili / youtube）
- 单 P 视频字幕成功 → `official_subtitle` artifact 落库
- 多 P 视频 `?p=N` 切换正确
- 无字幕：bilibili 触发 ASR fallback；YouTube 提示 NO_SUBTITLE_TRACK
- 多语言字幕优先级正确（bilibili 偏好中文；YouTube zh-Hans > zh-CN > zh > en）

### 文章型（generic / wechat / zhihu）
- 普通博客（如 overreacted.io）：通用兜底，markdown 完整
- 中文博客：处理中文字符与代码块
- 公众号文章：图片懒加载补 src，尾部推荐被去除，作者 / 时间 / 封面齐全
- 知乎专栏（zhuanlan）：折叠内容展开，作者 / 时间正确
- SPA 文档站（如 react.dev）：通用兜底在已渲染 DOM 上工作
- 失败页面（about:blank / Gmail）：错误提示清晰，不崩

### 数据核对
- `Resource.sourceType ∈ { bilibili, web_page, youtube, douyin }`
- 文章型：`Resource.sourceType = web_page`，对应 Job `inputContext.providerContext.webPage.extractor` 是 `generic_article_v1` / `wechat_article_v1` / `zhihu_answer_v1`
- Job 按 `resourceId + captureRequestId` 幂等
- Artifact `kind = official_subtitle` 或 `extracted_text + format=markdown`，`isPrimary = true`，可被 learning / discussion 流程识别

## 7. 添加新 extractor

1. 新建 `extensions/chrome-capture/shared/extractors/<site>-<kind>.js`
2. IIFE 内向 `root.extractors[provider]` 注册（`provider`、`matches`、`extract`）
3. 在 `manifest.json` 的 `content_scripts.js` 数组里加入新文件
4. 在 `shared/extractor-registry.js` 的 `SITE_ADAPTERS` 数组中按优先级插入 `provider` 名
5. 文章型：把 `extractor` provider id 加到 `lib/capture/context.ts` 的 `webPageExtractorSchema` zod enum，以及 `extensions/chrome-capture/background.js` 的 `ALLOWED_WEB_PAGE_EXTRACTORS` 集合
6. 写单测：`__tests__/extensions/chrome-capture/extractors/<site>.test.ts`，使用 fake Defuddle + mock DOM

DOM 清洗工具复用 `shared/extractors/lib/dom-cleanup.js`：`expandLazyImages` / `removeSelectors` / `stripTrackingParams` / `normalizeSections`。
