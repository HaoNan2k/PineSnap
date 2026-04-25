# Extractor HTML Fixtures

每个 fixture 文件命名约定：`{site}-{scenario}.html`。

| 文件名 | 用途 | 来源建议 |
|-------|------|---------|
| `bilibili-single-p.html` | 单 P B 站视频页 | Chrome DevTools → Save as → Webpage Complete |
| `bilibili-no-subtitle.html` | 无字幕的 B 站视频页 | 同上 |
| `youtube-with-cc.html` | 带字幕的 YouTube 视频页 | 同上 |
| `youtube-no-cc.html` | 无字幕的 YouTube 视频页 | 同上 |
| `wechat-article-normal.html` | 正常公众号文章页 | 同上（在已登录浏览器中保存）|
| `wechat-article-deleted.html` | "该内容已被作者删除"页面 | 同上 |
| `zhihu-answer.html` | 知乎答案页 | 同上 |
| `zhihu-zhuanlan.html` | 知乎专栏文章页 | 同上 |
| `generic-blog-en.html` | 普通英文博客（如 overreacted.io）| WebFetch 或浏览器保存 |
| `generic-blog-zh.html` | 普通中文博客 | 同上 |
| `generic-spa-docs.html` | SPA 文档站（如 react.dev）| 同上 |

抓取要点：

1. 使用浏览器的 "Save as → Webpage, Complete" 选项，保留全部 DOM 渲染状态
2. 公众号 / 知乎类反爬严重的站点必须从已登录的 Chrome 拉，不要用 curl
3. 保存后清理：检查 `<script>` 标签里有没有用户身份信息（cookies、token），有则手动剔除
4. 文件大小不强求，但单个建议 <2MB（避免 git 仓库膨胀）

如果某个 fixture 暂时拿不到，写一个 minimal mock HTML（标准结构 + 关键 selector）也能跑测试，但抽取质量验证会失真。
