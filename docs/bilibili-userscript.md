# B 站 Userscript 采集（MVP）

本功能允许用户在 `https://www.bilibili.com/video/*` 视频页一键采集字幕并发送到 PineSnap，最终会在 PineSnap 内存入一条素材记录（`Resource`）。

> 推荐使用“连接 Bilibili”流程：`docs/connect-bilibili.md`。

## 使用前提

- 已安装 Userscript 管理器（Tampermonkey / Violentmonkey 等）
- 你可以访问 PineSnap（线上域名或本地 `http://localhost:3000`）
- 你在 PineSnap 中已登录（用于启用连接；素材库 UI 后续提供）

## 安装脚本（连接 Bilibili）

本项目仅保留“连接 Bilibili”的安装方式（无需手动配置），请在 PineSnap 中打开：

- `/connect/bilibili` → 点击 **一键启用（安装浏览器连接器）**

## 使用与结果

1. 打开任意 B 站视频页（`https://www.bilibili.com/video/*`）
2. 点击右下角浮动按钮 **发送到 PineSnap**
3. 成功后脚本会提示“已存入素材库”（并在可用时附带 `resourceId`）

## 常见问题

### 发送失败：Unauthorized / Forbidden

通常表示连接已失效或需要重新启用。请回到 `/connect/bilibili` 重新点击“一键启用”。

### 未检测到可用内容

脚本会从 B 站 **视频 AI 小助手** 中提取内容：

- **视频总结**：总结正文 + 要点列表（带时间点）
- **字幕列表**：逐条字幕（带时间戳，`bilibili_ai_assistant_panel`）

建议你：

- 确认该视频支持字幕，并尝试打开 **AI 小助手 → 字幕列表**
- 确认 **AI 小助手 → 视频总结 / 字幕列表** 已生成内容后再重试

