# 提案：通过 Userscript 采集 B 站字幕并发送至 PineSnap

## 背景

PineSnap 希望优先交付“采集 B 站内容”能力，以支持用户在 B 站视频页一键将字幕内容发送到 PineSnap，为后续整理与学习闭环提供输入素材。

当前阶段的范围被刻意收敛为：

- 只做 **B 站采集**
- 只做 **Userscript（油猴脚本）入口**
- 不讨论“粘贴 URL 解析”“队列/等待/异步处理”等后续能力

## 目标

- 用户在 `bilibili.com/video/*` 视频页点击“发送到 PineSnap”按钮，脚本 SHALL 采集可用字幕并以结构化 payload POST 到 PineSnap 服务端。
- 采集 payload SHALL 使用约定的 `PineSnapBilibiliCapturePayloadMVP`（见 spec delta），确保后续可扩展而不破坏兼容。
- PineSnap 服务端 SHALL 提供一个稳定的采集接收端点契约（仅定义契约，不在本提案实现代码）。

## 非目标

- 不实现：在 PineSnap 页面粘贴 B 站 URL 后自动解析并采集内容。
- 不实现：下载视频/音频、自动转写、弹幕采集、评论采集。
- 不实现：等待进度、后台任务队列、存储与索引等后续流程。

## 交互概览（MVP）

- 用户安装 Userscript（通过 GreasyFork 或 PineSnap 自托管安装页，见 design）。
- 用户打开 B 站视频页，看到一个“发送到 PineSnap”按钮。
- 点击按钮后：
  - 若可获得字幕：脚本将字幕转成 `cues[]` 并 POST 给 PineSnap。
  - 若无法获得字幕：脚本给出明确提示（例如“未检测到可用字幕，请确认视频开启字幕/AI 小助手字幕可用”）。

## 风险与约束（摘要）

- 脚本运行在 `bilibili.com`，请求发送到 PineSnap 域名，跨域与鉴权必须明确（见 design）。
- 采集依赖 B 站 **视频 AI 小助手**面板的 DOM（CSS Modules 类名可能变化），因此 MUST 提供版本标识与 `extractor` 字段以便排障与兼容。

## 产出物

- `openspec/changes/add-bilibili-userscript-capture/specs/content-capture/spec.md`
- `openspec/changes/add-bilibili-userscript-capture/design.md`
- `openspec/changes/add-bilibili-userscript-capture/tasks.md`

