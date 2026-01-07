# Proposal: rename bilibili extractor to bilibili_ai_assistant_panel

## Why

当前 `PineSnapBilibiliCapturePayloadMVP.subtitles.extractor` 使用 `bilibili_ai_assistant_subtitle_list` 命名，但实际采集已覆盖 B 站「视频 AI 小助手」**整个面板**（包含视频总结 + 字幕列表），因此需要一个更准确、可维护的枚举值名称。

## Scope

- 将 `extractor` 枚举值从 `bilibili_ai_assistant_subtitle_list` **重命名**为 `bilibili_ai_assistant_panel`
- 同步更新服务端校验（`POST /api/capture/bilibili`）、Userscript 与文档/规范引用

## Non-goals

- 不改变 payload 结构（仍然通过 `subtitles.cues[]` 携带内容）
- 不新增字段（不引入新的顶层 `summary` 字段）

