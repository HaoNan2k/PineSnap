# Tasks: update-bilibili-extractor-ai-assistant-panel

- [ ] 更新 OpenSpec delta：重命名 `subtitles.extractor` 枚举值为 `bilibili_ai_assistant_panel`
- [ ] 更新服务端接收端点：`POST /api/capture/bilibili` 接受 `bilibili_ai_assistant_panel`
- [ ] 更新 Userscript：发送 payload 时使用 `bilibili_ai_assistant_panel`
- [ ] 更新文档：更新 extractor 名称与语义说明
- [ ] 运行 `openspec validate update-bilibili-extractor-ai-assistant-panel --strict`

