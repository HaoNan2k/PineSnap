# content-capture / spec delta

## MODIFIED Requirements

### Requirement: extractor 命名调整为 bilibili_ai_assistant_panel

系统 SHALL 将 `PineSnapBilibiliCapturePayloadMVP.subtitles.extractor` 的枚举值从 `bilibili_ai_assistant_subtitle_list` 重命名为 `bilibili_ai_assistant_panel`，以反映采集来源为「视频 AI 小助手」面板（视频总结 + 字幕列表）。

#### Scenario: Userscript sends bilibili_ai_assistant_panel

- Given Userscript 通过 B 站“视频 AI 小助手”面板提取内容
- When Userscript 发送采集结果到 `POST /api/capture/bilibili`
- Then `subtitles.extractor` SHOULD 为 `"bilibili_ai_assistant_panel"` 或 `"unknown"`

