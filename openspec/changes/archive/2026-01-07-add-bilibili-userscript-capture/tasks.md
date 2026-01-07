# 任务清单：B 站 Userscript 采集（MVP）

- [x] 定义采集 payload（`PineSnapBilibiliCapturePayloadMVP`）与 `extractor` 语义，并通过 OpenSpec strict 校验
- [x] 定义 PineSnap 接收端点契约（方法、路径、鉴权、响应形态）
- [x] 实现 Userscript：在 `bilibili.com/video/*` 注入“发送到 PineSnap”按钮并绑定点击行为
- [x] 实现采集：基于 B 站“视频 AI 小助手”面板提取**视频总结 + 字幕列表**并规范化为 `cues[]`
- [x] 实现发送：将 payload POST 至 PineSnap 端点，并携带 `Authorization: Bearer <token>`
- [x] 实现最小错误提示与重试引导（无字幕/提取失败/发送失败）
- [x] 提供安装与配置文档（GreasyFork 发布或 PineSnap 自托管安装页）
- [ ] 手动验收（@Browser）：在 3 个不同视频页验证“可采集/不可采集/网络失败”三种路径

