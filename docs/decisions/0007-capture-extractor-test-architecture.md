# 0007 — Capture extractor 的 e2e fixture 测试架构

- 日期：2026-05-09（基础设施）/ 2026-05-10（实施）
- 状态：accepted

## 背景

Chrome capture 扩展承担"网页 → Markdown 学习素材"的入口。当前实现：

- `extensions/chrome-capture/shared/extractors/` 下 5 个 extractor：4 个站点专用（bilibili / youtube / wechat / zhihu）+ 1 个通用兜底 `generic-article`，兜底层用 [Defuddle](https://github.com/kepano/defuddle) 抽正文。
- 已有 vitest 测试位于 `__tests__/extensions/chrome-capture/`，但**生成方式都是 mock Defuddle / mock DOM 片段**，验证的是包装逻辑、错误码分支，不是真实页面上的抽取质量。
- `__tests__/extensions/chrome-capture/fixtures/` 只有一个 README，没有任何真实 HTML 样本入库。

由此带来两类盲区：

1. **质量回归看不见**：Defuddle 升级、selector 调整、DOM 清理规则改动后，没有客观办法判断"对真实页面是变好还是变差"。
2. **覆盖广度看不见**：generic-article 兜底在哪些类型的页面上工作良好、在哪些上崩盘，团队没有共识。

需要一套**真实页面驱动**的回归测试，长期维护、可复现、能反映抽取质量的真实变化。

## 调研到的可借用方案

| 方案 | 角色 | 关键发现 |
|---|---|---|
| **Defuddle 自身** | 抽取引擎 | 当前选型已对——它是 Obsidian Web Clipper 同款，比 Mozilla Readability 更适合"网页 → Markdown"。Postlight Parser 已停止维护。 |
| **Defuddle 仓库的 [`tests/fixtures/`](https://github.com/kepano/defuddle/tree/main/tests/fixtures) + [`tests/fixtures.test.ts`](https://github.com/kepano/defuddle/blob/main/tests/fixtures.test.ts)** | 测试架构蓝本 | 真实 HTML 文件 + expected `.md` 文件做 snapshot diff，首次跑自动生成 baseline，删除 expected 文件触发重建。无需写脆弱的"语义断言"。 |
| **Defuddle 的 [`CLAUDE.md`](https://github.com/kepano/defuddle/blob/main/CLAUDE.md)** | 写测试的硬规则 | 三条：①fixture 必须先在旧代码上失败 ②永不用 `innerHTML`，用 `parseHTML()` 走 `<template>` ③匿名化（替换姓名/邮箱/URL/身份信息）。 |
| **[SingleFile](https://github.com/gildas-lormeau/SingleFile) 浏览器扩展** | fixture 抓取工具 | 把整页（CSS/图片/字体/iframe）打包成单个自包含 HTML 文件。比"另存为 → 网页完整版"产物干净得多，可 commit、可重放。 |
| **[Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper)** | 站点 adapter 参考实现 | MIT 开源。0.18 版内置 LinkedIn / Threads / Bluesky / Discourse / Medium 的 site adapter，与我们 4 个站点 adapter 不重叠，未来要扩展时可直接借鉴架构。 |
| **VCR cassette 模式** | 思想参考 | 录制+回放思路适合 HTTP 层；DOM extractor 用 SingleFile 快照更对路。但"录一次、长期回放、改时显式重录"的纪律可借用。 |

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| **A. 现状（mock Defuddle）** | 跑得快、隔离好 | 测不到真实抽取质量，已出现的盲区不会消失 |
| **B. 自建语义断言**（"标题包含 X / 段落数 ≥ N / 不含 navbar 关键词"） | 灵活 | 断言写得脆，每次站点改版要手工调；review 时看不出语义变化 |
| **C. Snapshot diff（抄 Defuddle 模式）** | 上游已经验证过的工程实践，review 友好（`.md` 可读），可反哺上游 | 站点改版后需要显式重录 expected，要建立纪律 |
| **D. 在线抓取，每次跑测试时 fetch** | fixture "永远新鲜" | 不稳定（断网/限流/反爬）、不可复现、隐私风险（fixture 可能含登录态） |

## 决策

采用 **方案 C — Snapshot diff，抄 Defuddle 自家测试架构**，并配套：

1. **fixture 抓取工具**：用 SingleFile 浏览器扩展。
2. **fixture 命名**：`{category}--{scenario}.html`（与 Defuddle 一致，例 `youtube--with-cc.html`、`generic--overreacted-blog.html`）。
3. **fixture frontmatter**：HTML 顶部 `<!-- {"url": "原始 URL", "capturedAt": "ISO date"} -->`。
4. **expected 产物**：`tests/expected/{fixtureName}.md`，包含 JSON metadata 前置 + Markdown 正文，便于 git diff review。
5. **测试驱动**：仿写 `fixtures.test.ts`，首次跑生成 baseline、之后严格比对、删除 expected 触发重建。
6. **三条铁律写进 fixtures README**：fixture 先失败 / 永不 innerHTML / 匿名化。
7. **generic-article extractor 改跑真实 Defuddle**（不再 mock）；站点专用 extractor 继续以 mock 为主，因其逻辑核心是字幕拼接、不依赖 Defuddle。

## 理由

- **不造轮子**：Defuddle 上游已经把"snapshot diff + 真 HTML + JSON frontmatter"这套打磨过，直接抄能省掉至少一周自建测试基础设施的时间。
- **review 友好**：expected `.md` 是人类可读的，PR diff 一眼能看出"标题变了 / 某段被吞了 / 代码块格式坏了"，远胜不可见的 vitest snapshot。
- **隐私可控**：SingleFile 产物 + 匿名化纪律 + 入仓前 lint 检查（禁词清单：cookie / token / 邮箱 / 真实姓名），三层防护。
- **反哺机会**：Defuddle 自己的开发者承认"测试主要靠 manual + user feedback，想加测试还没加"。我们建好的 fixture 库（特别是中文站点），未来有机会贡献回上游。
- **可演进**：第一阶段只做 generic-article + 站点 extractor 各一个 happy-path fixture，跑通管线；后续按"已支持站点回归基线 / 通用兜底覆盖广度 / 已知棘手 case / 边界破坏性 case"分层扩展。

## 影响

- 新增 `__tests__/extensions/chrome-capture/fixtures/*.html` 与 `expected/*.md`，前者来自 SingleFile 抓取，后者由测试 driver 首次自动生成。
- 现有 `generic-article.test.ts` 中的 mock-Defuddle 路径保留作为单元测试；新增独立的 `fixtures.test.ts` 跑真实 Defuddle。
- `package.json` 不强制新增依赖（Defuddle bundle 已通过 `pnpm build:extension` 在 `dist/` 中可用，测试时直接 import）。
- README 补充"如何抓 fixture / 如何更新 expected / 三条铁律"操作手册，路径 `__tests__/extensions/chrome-capture/fixtures/README.md`（替换现有占位 README）。
- `tooling/claude-code-plugin-skill-guide.md` 不受影响（SingleFile 是用户自装浏览器扩展，不进 npm 依赖）。
- 后续 OpenSpec 提案 `establish-capture-extractor-fixture-tests` 承载具体落实任务。

## 实施记录（2026-05-10）

OpenSpec change `establish-capture-extractor-fixture-tests` 已落地，phase 1 完成的事：

| 项目 | 实物 |
|---|---|
| 测试 driver | `__tests__/extensions/chrome-capture/fixtures-driver.test.ts`，跑真 `defuddle/node`，首次生成 baseline、二次严格 diff |
| 隐私扫描 | `scripts/lint-capture-fixtures.mjs`（CLI 与 driver 共用单一真相），9 条规则覆盖 cookie/token/邮箱/身份证/手机号 |
| spike fixture | `generic--english-blog.html`（overreacted.io，curl SSR）/ `generic--spa-docs.html`（react.dev，curl SSR） |
| baseline | `expected/generic--english-blog.md`（13.8KB，2040 词）/ `expected/generic--spa-docs.md`（988 词） |
| 文档 | fixtures README 重写、`docs/capture/chrome-extension.md` 加"§8 添加回归测试" |
| 包脚本 | `pnpm lint:fixtures` |

实施中观察到的几个关键事实：

1. **defuddle@0.6.6 已经是 devDependency**（不是只在扩展 bundle 里），`defuddle/node` 入口可直接 `import`，jsdom 在 Defuddle 内部初始化、不需要测试侧自己 setup。
2. **react.dev 的 SPA 页面 curl 也能跑**：Defuddle 报 `Initial parse returned very little content, trying again`，第二次扫描放宽规则后拿到了正文（`wordCount=988`）。这是 multi-pass 容错的真实证据，也说明对**带 SSR 的 SPA**，curl 抓的 HTML 已经够 jsdom 跑出和浏览器近似的视角；纯 CSR 应用仍然需要 SingleFile。
3. **基线确实拦得住回归**：篡改 `expected/generic--english-blog.md` 中标题一个字符，driver 立刻报 fail 并输出准确 line number；恢复后绿。
4. **隐私 lint 拦截有效**：往 fixture 末尾加一行 `Authorization: Bearer abc...`，`pnpm lint:fixtures` 命中两条规则（authorization-header + bearer-token）并 exit 1。

phase 2（站点 fixture：bilibili / youtube / wechat / zhihu）必须用 SingleFile 在已登录浏览器中抓取，无法在
agent 工作流中独立完成；触发条件是用户提交首个 site fixture 后起新提案 `extend-capture-fixture-coverage`。
