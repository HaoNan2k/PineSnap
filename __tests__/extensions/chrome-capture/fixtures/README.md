# Capture extractor 真实 HTML fixture 库

Snapshot-diff 回归基线。详见
[`docs/decisions/0007-capture-extractor-test-architecture.md`](../../../../docs/decisions/0007-capture-extractor-test-architecture.md)
与
[`openspec/changes/establish-capture-extractor-fixture-tests/specs/capture-extractor-quality/spec.md`](../../../../openspec/changes/establish-capture-extractor-fixture-tests/specs/capture-extractor-quality/spec.md)。

## 三条铁律

直接抄 [Defuddle 的 CLAUDE.md](https://github.com/kepano/defuddle/blob/main/CLAUDE.md)：

1. **fixture 必须先在旧代码上失败**
   修复某 extractor bug 时新增的 fixture，必须先在未修复的代码上跑出失败；一个在新旧代码上都通过的 fixture 不证明任何东西。
   提 PR 时附上"先 revert 修复 → 跑测试 → 看到失败"的证据（截图或 log 片段）。

2. **永远不要用 `innerHTML` 直接构造 DOM**
   driver 与辅助代码中，使用 `parseHTML()` 或等价的 `<template>` 包装方法。`innerHTML` 会触发脚本执行与资源加载，污染测试环境。

3. **入仓前匿名化**
   真实姓名、邮箱、URL 中的用户标识、cookie、Bearer token、身份证号、手机号等敏感信息必须替换为占位符或删除。
   `pnpm lint:fixtures` 会扫禁词清单（在 `scripts/lint-capture-fixtures.mjs`），命中即测试失败。

## 命名约定

```
{category}--{scenario}.html
```

- `{category}` 取自已注册 extractor：`generic` / `bilibili` / `youtube` / `wechat` / `zhihu`
- `{scenario}` 用连字符英文短语，描述场景

例：
- `generic--english-blog.html` — 英文博客 happy path
- `generic--spa-docs.html` — SPA 文档站
- `bilibili--single-p.html` — 带官方字幕的单 P
- `wechat--article-deleted.html` — 已删除文章页

## fixture 顶部 frontmatter

每个 fixture 必须在最顶部加一行 JSON 注释：

```html
<!-- {"url": "https://...", "capturedAt": "2026-05-10", "notes": "可选说明"} -->
<!DOCTYPE html>
<html>...
```

driver 用正则 `<!--\s*(\{[\s\S]*?\})\s*-->` 解析，缺失则回退到文件名推断 URL。

## 抓取流程

### 推荐：SingleFile 浏览器扩展

[SingleFile](https://github.com/gildas-lormeau/SingleFile)（开源，跨浏览器）把整页（CSS / 图片 / 字体 / iframe）打包成单个自包含 HTML。比"另存为 → 网页完整版"产物干净得多，可 commit、可重放。

1. 安装 SingleFile（[Chrome Web Store](https://chromewebstore.google.com/detail/singlefile/mpiodijhokgodhhofbcjdecpffjipkle) / [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/single-file/)）
2. 打开目标页面（公众号 / 知乎 / B 站等需要登录的，先在浏览器里登录）
3. 等待页面**完全加载、JS 渲染完成**（特别是 SPA：滚到底、等动画结束、确认正文都渲染出来了）
4. 点 SingleFile 扩展按钮 → 下载单文件 HTML
5. 重命名为 `{category}--{scenario}.html`，移动到 `__tests__/extensions/chrome-capture/fixtures/`
6. 在最顶部加 frontmatter（见上）
7. 跑 `pnpm lint:fixtures` 验证匿名化
8. 跑 `pnpm test __tests__/extensions/chrome-capture/fixtures-driver.test.ts` 生成 baseline
9. review `expected/{name}.md`，确认抽取质量符合预期再 commit

### 备选：curl（仅静态 SSR 站点）

对于完全 SSR 的站点（博客、文档站、新闻），直接 curl 即可。这是 spike 阶段使用的快路径，但**不适用于 SPA 严重依赖 JS 渲染的站点**，也不适用于反爬严重的站点。

```sh
curl -sL -A "Mozilla/5.0 ..." "https://example.com/post" -o /tmp/page.html
# 加 frontmatter，移到 fixtures/ 目录，rename
```

## 单 fixture 文件大小约束

≤ 2MB。超出时通过 SingleFile 选项压缩资源、裁剪非关键 iframe，或拆分为多个场景。仓库不引入 git LFS。

## 工作流

### 新增 fixture

```sh
# 1. SingleFile 抓页面 → 移动到 fixtures/，加 frontmatter
# 2. 隐私扫描
pnpm lint:fixtures

# 3. 生成 baseline
pnpm test __tests__/extensions/chrome-capture/fixtures-driver.test.ts

# 4. review expected/{name}.md，确认抽取质量
git add __tests__/extensions/chrome-capture/{fixtures,expected}/{name}.{html,md}
```

### 更新过期 fixture（站点改版后）

```sh
# 1. 删除 expected
rm __tests__/extensions/chrome-capture/expected/{name}.md

# 2. 重新抓 fixture（如果原页面也变了）
# 3. 跑测试，重新生成 baseline
pnpm test __tests__/extensions/chrome-capture/fixtures-driver.test.ts

# 4. git diff expected/{name}.md，对比新老 baseline
# 5. 确认变化是预期的（不是回归），commit
```

### 调试抽取失败

按 [Defuddle CLAUDE.md "Debugging strategy"](https://github.com/kepano/defuddle/blob/main/CLAUDE.md) 步骤：

1. 跑 `Defuddle(html, url, { debug: true })` 拿 `result.debug.removals`，看哪条 selector 把内容删了
2. 逐个禁用 pipeline 步骤（`removeLowScoring: false` / `removeBySelector: false`）定位
3. 必要时在 `contentSelector` 里手动指定主内容元素
4. 修复后**先 revert 修复跑一次确认 fixture 失败**，再 commit 修复

## 当前 fixture 清单

| 文件 | 类别 | 场景 | 抓取方式 |
|---|---|---|---|
| `generic--english-blog.html` | generic | 英文长文 + 代码块（overreacted.io） | curl SSR |
| `generic--spa-docs.html` | generic | SPA 文档站（react.dev） | curl SSR（含 React Server Components 输出） |

## 待补充（需 SingleFile 抓取）

下列 fixture 涉及登录态 / hydration / 反爬，必须通过 SingleFile 在浏览器中抓取，不能用 curl。
按需新增，每个独立 commit：

- `bilibili--single-p.html`（B 站带官方字幕的单 P 视频页）
- `youtube--with-cc.html`（YouTube 带官方 CC 的视频页）
- `wechat--article-normal.html`（公众号普通图文）
- `zhihu--answer.html`（知乎答案页）

新增任一 site fixture 时，对应站点 driver 会自动 discover；首次跑生成 baseline，二次跑严格 diff（同 generic driver 的契约）。

## 反例（不要做）

| 错误做法 | 为什么不行 |
|---|---|
| 写 minimal mock HTML 充当 fixture | 抽取质量验证失真，违背"真实页面驱动"的初衷 |
| 用 vitest inline snapshot | 不可读，PR review 看不出语义变化 |
| 把 token / cookie / 邮箱留在 fixture 里 | 隐私泄漏；lint 也会拦下来 |
| 跳过 baseline review 直接 commit | 等于把"未来的回归"标准化成"现在的 bug" |
