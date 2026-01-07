# Design: 细分 B 站字幕采集来源（AI 小助手字幕列表优先）

## 术语与字段

`PineSnapBilibiliCapturePayloadMVP.subtitles.extractor`：

- `bilibili_ai_assistant_panel`：Userscript 通过点击并读取 B 站「视频 AI 小助手」面板内容提取内容（包含视频总结与字幕列表，带时间戳的逐条条目）。
- `unknown`：无法可靠标识采集方式时的兜底标记。

## 提取策略（客户端）

优先级：

1. **AI 小助手面板**（`bilibili_ai_assistant_panel`）
   - 触发 `.video-ai-assistant` 打开面板
   - 找到并点击“字幕列表”
   - 仅提取“时间戳 + 文本”结构化条目（以时间戳正则为锚点）
2. **不提供 page_dom 兜底**
   - 采集仅依赖 AI 小助手面板（视频总结 + 字幕列表）

## 服务端处理（不变）

服务端继续把 `subtitles.cues[]` 规范化拼成一段文本并写入对话；本次仅扩展 `extractor` 的取值范围用于诊断与观测，不改变落库语义。

