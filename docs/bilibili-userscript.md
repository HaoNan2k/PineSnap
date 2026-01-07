# B 站 Userscript 采集（MVP）

本功能允许用户在 `https://www.bilibili.com/video/*` 视频页一键采集字幕并发送到 PineSnap，最终会在 PineSnap 内创建一条新的对话并写入字幕文本。

> 面向普通用户推荐使用“连接 Bilibili”流程：`docs/connect-bilibili.md`（无需理解 token/脚本细节）。

## 使用前提

- 已安装 Userscript 管理器（Tampermonkey / Violentmonkey 等）
- 你可以访问 PineSnap（线上域名或本地 `http://localhost:3000`）
- 你在 PineSnap 中已登录（用于在 PineSnap 内管理 token、查看写入的对话）

## 1) 生成 Capture Token（一次性复制）

1. 登录 PineSnap
2. 右上角用户头像菜单 → **采集 Token**
3. 点击 **生成**
4. 复制弹出的 token（**只显示一次**）

> 建议：每台设备/每个脚本环境生成一个 token。泄露或不用时随时撤销。

## 2) 安装脚本（推荐：连接 Bilibili）

本项目仅保留“连接 Bilibili”的安装方式（由 PineSnap 动态注入 token），请在 PineSnap 中打开：

- `/connect/bilibili` → 点击 **一键启用（安装浏览器连接器）**

## 3) 配置 PineSnap 地址与 Token

使用“连接 Bilibili”安装的脚本会自动携带 token，无需手动配置。

## 4) 使用与结果

1. 打开任意 B 站视频页（`https://www.bilibili.com/video/*`）
2. 点击右下角浮动按钮 **发送到 PineSnap**
3. 成功后脚本会尝试打开 PineSnap 中新创建的对话（需要你已在 PineSnap 域名登录）

## 常见问题

### 发送失败：Unauthorized / Forbidden

- **Unauthorized**：token 缺失/错误/已撤销
- **Forbidden**：token 没有 `capture:bilibili` scope（默认生成的 token 会包含该 scope）

### 未检测到可用内容

脚本会从 B 站 **视频 AI 小助手** 中提取内容：

- **视频总结**：总结正文 + 要点列表（带时间点）
- **字幕列表**：逐条字幕（带时间戳，`bilibili_ai_assistant_panel`）

建议你：

- 确认该视频支持字幕，并尝试打开 **AI 小助手 → 字幕列表**
- 确认 **AI 小助手 → 视频总结 / 字幕列表** 已生成内容后再重试

