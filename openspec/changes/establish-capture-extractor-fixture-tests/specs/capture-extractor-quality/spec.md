# capture-extractor-quality Specification

## ADDED Requirements

### Requirement: Capture extractors SHALL be regression-tested against real-world HTML fixtures

系统 SHALL 为 capture 扩展的每个 extractor 维护一组真实页面 HTML fixture，作为长期回归基线。
fixture MUST 物理存放在 `__tests__/extensions/chrome-capture/fixtures/` 下，命名形如
`{category}--{scenario}.html`，其中 `{category}` 取自 `generic` / `bilibili` / `youtube` / `wechat` / `zhihu`
等已注册 extractor 名，`{scenario}` 用连字符英文短语描述场景。

每个 fixture 顶部 MUST 包含 JSON frontmatter HTML 注释 `<!-- {"url": "...", "capturedAt": "YYYY-MM-DD"} -->`，
记录原始页面 URL 与抓取日期。

#### Scenario: 通用兜底 extractor 的 fixture 跑真实 Defuddle

- **WHEN** 开发者运行 `pnpm test`
- **THEN** fixture-driver 测试 SHALL 自动发现 `fixtures/generic--*.html`
- **AND** SHALL 用 Node 入口 `defuddle/node` 跑真实 Defuddle 抽取
- **AND** SHALL 把抽取结果（JSON metadata 前置 + Markdown 正文）与 `expected/{name}.md` 严格比对
- **AND** 任何 diff MUST 导致测试失败

#### Scenario: 新 fixture 首次跑生成 baseline

- **WHEN** 开发者新增了 `fixtures/{name}.html` 但没有对应的 `expected/{name}.md`
- **THEN** fixture-driver SHALL 把当次抽取结果写入 `expected/{name}.md` 作为 baseline
- **AND** 测试 SHALL 通过（避免阻塞 baseline 生成）
- **AND** 后续运行 SHALL 严格 diff baseline

#### Scenario: 删除 expected 文件触发重建

- **WHEN** 开发者删除 `expected/{name}.md` 后运行 `pnpm test`
- **THEN** fixture-driver SHALL 重新写入 baseline
- **AND** 开发者 SHALL 在 commit 前 review 新 baseline 是否符合预期

### Requirement: Extractor test fixtures SHALL be reproducible and anonymized

fixture 抓取流程 SHALL 使用 SingleFile 浏览器扩展，把整页（CSS / 图片 / 字体 / iframe）打包成单个自包含 HTML。
fixture 入仓前 MUST 经过匿名化处理：真实姓名、邮箱、URL 中的用户标识、cookie、Bearer token、身份证号
等敏感信息 MUST 替换为占位符或删除。

系统 MUST 提供 `scripts/lint-capture-fixtures.mjs` 隐私扫描脚本，对 `fixtures/**/*.html` 扫描禁词清单
（至少包含 `Cookie:` / `Authorization:` / `Bearer ` / `token=` / 邮箱正则 / 中文身份证号正则）。
fixture-driver 测试启动时 MUST 调用该脚本；命中任一禁词 MUST 导致测试失败并输出文件名与行号。

#### Scenario: 隐私扫描拦截敏感信息

- **WHEN** fixture 中存在字符串 `Authorization: Bearer abc123`
- **WHEN** 开发者运行 `pnpm test` 或 `pnpm lint:fixtures`
- **THEN** lint 脚本 MUST 返回非零退出码
- **AND** MUST 输出命中的文件路径、行号、截短后的命中片段
- **AND** fixture-driver 测试 MUST NOT 继续执行

#### Scenario: 单 fixture 文件大小约束

- **WHEN** 开发者尝试入仓单个 > 2MB 的 fixture
- **THEN** review 流程 SHALL 要求通过 SingleFile 选项压缩资源、裁剪非关键 iframe，或拆分为多个场景

### Requirement: Extractor test outputs SHALL be physically committed for review

expected 文件 SHALL 物理化存储在 `__tests__/extensions/chrome-capture/expected/{name}.md`，
格式包含 JSON metadata（title / author / site / published）前置代码块 + 抽取的 Markdown 正文。
此格式 MUST 保持人类可读，便于 PR diff review 时一眼识别"标题变了 / 段落被吞 / 代码块格式坏"等回归。

不允许使用 vitest snapshot inline 或不可读的二进制 snapshot 形式。

#### Scenario: PR review 时 diff 可定位语义变化

- **WHEN** 某次 PR 改动了 extractor 逻辑，导致某 fixture 的标题字段抽错
- **THEN** `expected/{name}.md` 文件的 git diff MUST 直接显示 `"title": "旧值"` 变为 `"title": "新值"`
- **AND** review 者 MUST 能在不跑代码的情况下判断变化是预期的还是回归

### Requirement: Fixture testing MUST follow the three upstream rules

系统 MUST 在 fixtures README 显式记录并要求遵守 [Defuddle CLAUDE.md](https://github.com/kepano/defuddle/blob/main/CLAUDE.md) 的三条测试铁律：

1. **fixture 必须先在旧代码上失败**：修复某 bug 时新增的 fixture，MUST 先在未修复的代码上跑出失败；
   一个在新旧代码上都通过的 fixture 不证明任何东西。
2. **永远不要用 `innerHTML` 直接构造 DOM**：在 driver 与辅助代码中，MUST 使用 `parseHTML()` 或等价的
   `<template>` 元素包装方法，避免脚本执行与资源加载。
3. **fixture 必须匿名化**：见 Requirement "fixtures SHALL be reproducible and anonymized"。

#### Scenario: 修复 extractor bug 时未先验证 fixture 失败

- **WHEN** 开发者声称修复了某 extractor bug 并提交新 fixture
- **THEN** review 流程 MUST 要求开发者展示"在 revert 修复后，fixture 测试确实失败"的证据
- **AND** 缺乏该证据 MUST 被打回

### Requirement: Site-specific extractors and generic fallback SHALL use separate test drivers

generic-article 兜底 extractor 的 fixture-driver 测试 MUST 跑**真实** Defuddle，
验证抽取质量。站点专用 extractor（bilibili / youtube / wechat / zhihu）的测试 MAY 继续以 mock 为主，
因其核心逻辑是字幕拼接与 cookie 流处理，不依赖 Defuddle。

**当首个站点 fixture（`fixtures/{bilibili|youtube|wechat|zhihu}--*.html`）入仓时**，
该批 fixture 的 driver MUST 独立于通用 driver，位于
`__tests__/extensions/chrome-capture/site-fixtures-driver.test.ts`，与通用 driver 不互相加载、
不互相 mock 污染。在没有任何站点 fixture 之前，该文件不强制存在。

现有 `__tests__/extensions/chrome-capture/extractors/generic-article.test.ts` MUST 保留，
定位为"包装逻辑单元测试"，与 fixture-driver 形成单元 + 集成两层覆盖。

#### Scenario: 通用 driver 与站点 driver 互不污染

- **WHEN** 开发者只运行 `vitest run __tests__/extensions/chrome-capture/fixtures-driver.test.ts`
- **THEN** 该 driver MUST 仅处理 `fixtures/generic--*.html` 系列
- **AND** MUST NOT 加载站点 extractor 模块或 mock fetch

#### Scenario: 站点 extractor mock 测试与 fixture 测试互不替代

- **WHEN** B 站 extractor 的字幕拼接逻辑改动
- **THEN** `__tests__/extensions/chrome-capture/extractors/bilibili.test.ts`（mock）SHALL 验证逻辑分支
- **AND** `site-fixtures-driver.test.ts`（真 HTML）SHALL 验证在真实 B 站页面 DOM 上整体流程不回归
