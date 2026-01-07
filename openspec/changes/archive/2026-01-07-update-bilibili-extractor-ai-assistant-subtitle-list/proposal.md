# Proposal: 细分 B 站字幕采集来源（AI 小助手字幕列表优先）

## Why

当前 B 站 Userscript 的采集依赖 AI 小助手面板 DOM。旧的 `page_dom` 路径（从页面可见 UI 的 DOM/面板内容做兜底）会引入噪声并增加维护成本，因此我们决定彻底移除该路径。

同时，我们希望在排障与观测上能区分“字幕来自 AI 小助手的字幕列表”还是“来自其它页面 DOM（兜底）”，以便：

- 更快定位 B 站 DOM 变更导致的失败/脏数据
- 更清晰统计采集质量与成功率

## Scope

- 扩展 `PineSnapBilibiliCapturePayloadMVP.subtitles.extractor` 的可选枚举值，新增：
  - `bilibili_ai_assistant_panel`
- Userscript 采集使用 AI 小助手面板提取“视频总结 + 字幕列表”，不再提供 `page_dom` 兜底策略。

## Non-goals

- 不引入媒体下载、转写或直接调用不稳定/鉴权复杂的内部 API
- 不改变服务端落库结构与消息 parts 结构
- 不实现边流边存

## Compatibility

- 服务端仅接受 `extractor: "bilibili_ai_assistant_panel"` 或 `"unknown"`。
- 旧版本 Userscript 若仍发送 `"page_dom"`，将被视为不兼容（需要升级脚本）。

