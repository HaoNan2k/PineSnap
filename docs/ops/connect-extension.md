# 连接 Chrome 扩展

## 这项连接能做什么？

连接后，PineSnap Capture 扩展可代表你的账号，把以下来源的内容一键存进素材库：

- **网页文章**：博客、新闻、技术文档、SPA 文档站等任意公开页面（通用 Defuddle 抽取）
- **微信公众号文章**：`mp.weixin.qq.com/s/...`，含正文 / 作者 / 发布时间 / 封面
- **知乎答案与专栏**：`zhihu.com/question/.../answer/...` 与 `zhuanlan.zhihu.com/p/...`
- **B 站视频字幕**：手动字幕优先，缺失时回退到云端 ASR 转写
- **YouTube 视频字幕**：按 zh-Hans → zh-CN → zh → en 优先级选轨

抽取出的正文 / 字幕统一写入 PineSnap 素材库（Resource + CaptureArtifact），供后续学习 / 讨论 / AI 加工使用。

## 如何连接（一次性启用）

1. 登录 PineSnap
2. 右上角头像菜单 → **连接扩展**
3. 安装 PineSnap Capture 扩展（Chrome Web Store 或开发者模式 unpacked）
4. 在扩展中点击「连接 PineSnap」，浏览器会弹出授权页
5. 在授权页确认 → 自动完成连接

授权后扩展会获得 `capture:*` 通配符 scope，可以采集所有支持的源，无需为每种源单独授权。

## 以后要怎么操作？

- **更换电脑 / 浏览器**：重新执行一次「连接扩展」即可
- **想停用 / 怀疑泄露**：进入连接页，点击「撤销连接」（即时生效，所有 token 失效）
- **从旧版扩展（仅 B 站）升级**：在 `chrome://extensions/` 重新加载或更新扩展，再走一次「连接扩展」拿到新的通配符 token；旧 `capture:bilibili` token 不再使用，可在连接页一并撤销

## 排障

- **采集时提示「连接已失效」**：token 过期或被撤销，重连即可
- **采集时提示「网络错误」**：服务端 CORS allowlist 没包含当前扩展 ID，更新 `CAPTURE_CORS_ALLOWED_ORIGINS` 后重启 dev server
- **公众号 / 知乎正文为空**：可能反爬触发或页面未完全渲染，刷新页面后重试
