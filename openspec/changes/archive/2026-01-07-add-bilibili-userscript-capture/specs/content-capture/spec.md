# content-capture / spec delta

## ADDED Requirements

### Requirement: 通过 Userscript 采集 B 站字幕并发送至 PineSnap

系统 SHALL 支持用户在 B 站视频页通过 Userscript 主动触发采集，并将采集结果发送至 PineSnap 服务端。

#### Scenario: 用户在 B 站视频页点击“发送到 PineSnap”

- Given 用户已安装并启用 PineSnap 的 B 站 Userscript
- And 用户正在访问 `https://www.bilibili.com/video/*` 的视频播放页
- When 用户点击“发送到 PineSnap”
- Then Userscript MUST 构造一个 `PineSnapBilibiliCapturePayloadMVP` 请求体并发送到 PineSnap 接收端点
- And 该行为 MUST 为“用户主动触发”（不得在后台自动批量采集）

### Requirement: 采集 payload 使用 PineSnapBilibiliCapturePayloadMVP（MVP）

系统 MUST 使用如下 payload 结构作为“B 站采集”的最小契约，以便后续扩展与兼容：

```ts
type PineSnapBilibiliCapturePayloadMVP = {
  v: 1;
  source: { url: string };
  video?: { title?: string; bvid?: string; p?: number };
  subtitles?: {
    extractor?: "bilibili_ai_assistant_panel" | "unknown";
    cues: Array<{ startLabel?: string; startMs?: number; endMs?: number; text: string }>;
  };
};
```

#### Scenario: AI 小助手面板采集方式（视频总结 + 字幕列表）

- Given Userscript 通过 B 站“视频 AI 小助手”面板提取视频总结与字幕列表
- When Userscript 发送采集结果
- Then `subtitles.extractor` SHOULD 为 `"bilibili_ai_assistant_panel"` 或 `"unknown"`
- And `subtitles.cues[].text` MUST 为人类可读的字幕文本
- And 当只能获得形如 `MM:SS` 的时间戳时，`subtitles.cues[].startLabel` SHOULD 填充该值

### Requirement: PineSnap 接收端点的请求与响应契约（MVP）

PineSnap 服务端 SHALL 提供一个稳定的 HTTP 端点用于接收采集结果。

#### Scenario: 接收端点基础契约

- Given Userscript 已构造 `PineSnapBilibiliCapturePayloadMVP`
- When Userscript 发送 `POST /api/capture/bilibili`
- Then 请求体 MUST 为 `application/json`
- And 服务端在成功接收后 MUST 返回可机器解析的确认响应（例如 `{ ok: true }`）

### Requirement: 跨域与鉴权（MVP）

由于 Userscript 运行在 `bilibili.com`，系统 MUST 定义一个跨域可行的鉴权策略。

#### Scenario: Bearer token 鉴权

- Given 用户已在 PineSnap 获得可撤销的 Capture Token
- When Userscript 调用 PineSnap 接收端点
- Then 请求 MUST 通过 `Authorization: Bearer <token>` 传递鉴权信息
- And token MUST 可被服务端撤销与轮换

