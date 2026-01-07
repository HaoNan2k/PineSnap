# content-capture / spec delta

## MODIFIED Requirements

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

#### Scenario: bilibili_ai_assistant_panel 采集方式（AI 小助手面板）

- Given Userscript 通过 B 站“视频 AI 小助手”的“字幕列表”面板提取字幕
- When Userscript 发送采集结果
- Then `subtitles.extractor` SHOULD 为 `"bilibili_ai_assistant_panel"`
- And `subtitles.cues[]` SHOULD 为“时间戳 + 文本”的逐条字幕

#### Scenario: AI 小助手面板采集方式（视频总结 + 字幕列表）

- Given Userscript 通过 B 站“视频 AI 小助手”面板提取视频总结与字幕列表
- When Userscript 发送采集结果
- Then `subtitles.extractor` SHOULD 为 `"bilibili_ai_assistant_panel"` 或 `"unknown"`
- And `subtitles.cues[].text` MUST 为人类可读的文本
- And 当只能获得形如 `MM:SS` 的时间戳时，`subtitles.cues[].startLabel` SHOULD 填充该值

