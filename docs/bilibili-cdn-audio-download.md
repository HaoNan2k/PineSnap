# B 站 CDN 音频下载：观察与决策记录

> 2026-04-13 验证记录。解释为什么 media candidates 是 B 站音频获取的主路径，
> 以及 Worker 下载 B 站 CDN 资源时需要注意什么。

## 背景

PineSnap 的 capture 流程需要从 B 站视频中提取音频，上传至 AssemblyAI 做 ASR 转写。
Worker 部署在新加坡（AWS），不在中国大陆。

## 核心发现

### 1. B 站 CDN 的 HTTP 头校验规则

通过对 `bilivideo.com` / `bilivideo.cn` / `akamaized.net` 等 CDN 域名的实际测试，
发现以下行为：

| 请求头组合            | HTTP 状态码 |
| -------------------- | ---------- |
| 无 headers           | 403        |
| Referer only         | 403        |
| Referer + Origin     | 403        |
| **Referer + User-Agent** | **200** |

**结论：B 站 CDN 要求请求同时携带 `Referer` 和 `User-Agent` 两个头。**
缺任意一个都返回 403。这不是 IP 校验——同一个 URL，用户浏览器（中国 IP）生成，
新加坡服务器带上正确的头就能成功下载。

### 2. CDN URL 不绑定 IP

验证方式：用户在中国大陆的浏览器里播放 B 站视频，从 DevTools Network 面板复制
`.m4s` 音频请求的 URL，然后在新加坡服务器上用 curl 下载。

- 中国 IP 生成的 URL → 新加坡 IP 下载 → **成功（HTTP 200，28MB）**
- URL 中的签名参数（`deadline`, `upsig` 等）有时效性但不绑定请求者 IP

这意味着：**扩展在用户浏览器中抓取的 media candidate URL，可以被海外 Worker 直接使用。**

### 3. B 站 API 的地域限制

B 站的公开 API（`/x/web-interface/view`、`/x/player/playurl`）对部分视频有地域限制：

- `BV1GJ411x7h7`（Rick Astley - Never Gonna Give You Up）从新加坡调用返回 `code: -404`
- `BV1im9vYKEWB` 从新加坡可正常返回

这意味着如果想在服务端通过 API 自行获取音频 URL，对地区限制的视频会失败。
而 media candidates 方案不受此限制——用户既然能在浏览器里播放视频，
扩展就一定能拿到有效的 CDN URL。

### 4. yt-dlp 在海外服务器上的困境

yt-dlp 从新加坡服务器解析 B 站视频页时，B 站返回 HTTP 412（Precondition Failed），
这是 B 站对自动化工具的风控。这也是我们需要 media candidates 作为主路径的直接原因。

## 架构决策

基于以上观察，音频获取的优先级为：

```
media candidates（扩展提供）→ yt-dlp（兜底）
```

- **media candidates 是主路径**：扩展从用户浏览器的网络请求中抓取 DASH 音轨直链，
  随 capture job 一起提交。Worker 带上 Referer + User-Agent 直接下载。
- **yt-dlp 是兜底**：当没有 media candidates 时尝试，但对 B 站视频在海外服务器上
  大概率失败（412）。

### 代码中的关键实现

`lib/capture/audio-download.ts` 中的 `buildMediaFetchHeaders`：

- 检测 B 站 CDN 域名（`bilivideo.com`、`bilivideo.cn`、`hdslb.com`、`akamaized.net`）
- 自动补充 `Referer: https://www.bilibili.com/`（如果调用方未提供）
- 自动补充 `User-Agent`（如果调用方未提供），使用一个通用 Chrome UA 字符串
- 两个头都是必需的，缺一返回 403

### 扩展需要做的事

扩展在用户浏览器中需要：

1. 监听视频页面的网络请求，识别 DASH 音轨（`.m4s`，codec ID `30216`/`30232` 等）
2. 将音轨 URL 作为 `mediaCandidates`（`kind: "audio"`）随 capture 请求提交
3. 同时传递 `accessContext.referer` 和 `accessContext.userAgent`

**注意：CDN URL 有签名时效（`deadline` 参数），提交后应尽快被 Worker 处理。**
目前 Worker 的轮询间隔为 10 秒，正常情况下 URL 不会过期。

## 验证记录

| 时间 | 测试 | 结果 |
| ---- | ---- | ---- |
| 2026-04-13 15:12 | Worker 通过 B 站 API 获取非地区限制视频音频 | 成功（2.1MB 音频 → ASR → SUCCEEDED） |
| 2026-04-13 15:11 | Worker 通过 B 站 API 获取地区限制视频 | 失败（API 返回 -404） |
| 2026-04-13 15:15 | 跨 IP 下载（中国浏览器 URL → 新加坡 curl，Referer+UA） | 成功（28MB，HTTP 200） |
| 2026-04-13 15:15 | 跨 IP 下载（仅 Referer） | 失败（HTTP 403） |
