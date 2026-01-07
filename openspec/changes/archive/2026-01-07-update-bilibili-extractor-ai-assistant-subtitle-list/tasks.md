# Tasks: update-bilibili-extractor-ai-assistant-subtitle-list

- [ ] 更新 OpenSpec delta：扩展 `PineSnapBilibiliCapturePayloadMVP.subtitles.extractor` 枚举
- [ ] 更新服务端接收端点：`POST /api/capture/bilibili` 接受 `bilibili_ai_assistant_panel`
- [ ] 更新 Userscript（公共脚本 + 连接脚本）：从 AI 小助手面板提取“视频总结 + 字幕列表”，不再提供 `page_dom` 兜底
- [ ] 更新文档：说明新的 extractor 语义与回退策略
- [ ] 运行 `openspec validate update-bilibili-extractor-ai-assistant-subtitle-list --strict`

