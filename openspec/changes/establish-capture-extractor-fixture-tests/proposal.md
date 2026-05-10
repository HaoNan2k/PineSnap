## Why

Chrome capture 扩展的 5 个 extractor（4 个站点专用 + 1 个 generic-article 兜底）目前测试都用 mock Defuddle / mock DOM 片段，
验证的是包装逻辑与错误码分支，**不验证真实页面上的抽取质量**。`__tests__/extensions/chrome-capture/fixtures/`
只有 README 没有任何真实 HTML 样本。

由此带来两类盲区：

1. **质量回归看不见**：Defuddle 升级、selector 调整、DOM 清理规则改动后，没有客观办法判断"对真实页面是变好还是变差"。
2. **覆盖广度看不见**：generic-article 兜底在哪些类型的页面工作良好、在哪些上崩盘，团队没有共识。

详细背景与方案对比见 `docs/decisions/0007-capture-extractor-test-architecture.md`。决策已落定：抄 Defuddle
自家 [`tests/fixtures.test.ts`](https://github.com/kepano/defuddle/blob/main/tests/fixtures.test.ts) 的
**snapshot diff** 测试模式 + [SingleFile](https://github.com/gildas-lormeau/SingleFile) 抓取真实页面 + 三条铁律。

本提案把决策落实成可执行的测试基础设施。

## What Changes

- 新建测试 driver `__tests__/extensions/chrome-capture/fixtures-driver.test.ts`，仿 Defuddle `fixtures.test.ts`：
  - 自动发现 `fixtures/*.html`，逐个跑真实 Defuddle
  - 首次跑生成 `expected/{name}.md`（JSON metadata 前置 + Markdown 正文）作为 baseline
  - 后续严格 diff，删除 expected 文件触发重建
  - HTML 顶部解析 `<!-- {"url": "..."} -->` JSON frontmatter 还原原始 URL
- **物理化**测试基线：fixture 与 expected 全部 commit 进仓库（包括 git LFS 视情况评估，单文件 < 2MB）
- 第一阶段 2 个 spike fixture（generic 兜底覆盖广度）：
  - `generic--english-blog.html`（overreacted.io 单篇，验证英文长文 + 代码块抽取）
  - `generic--spa-docs.html`（react.dev 一页，验证 SPA 文档站 SSR HTML 的多 pass 抽取）
- **站点 fixture 推到 phase 2**：bilibili / youtube / wechat / zhihu 的真实 fixture 必须用 SingleFile
  在已登录浏览器中抓取（涉及 hydration + 反爬 + 登录态），无法在 agent 工作流中独立完成。
  本提案先建立通用基础设施 + generic 兜底基线；site fixture + site driver 由后续提案
  `extend-capture-fixture-coverage` 承载，触发条件是用户提交首个 site fixture。
- 改写 `__tests__/extensions/chrome-capture/fixtures/README.md`：
  - 三条铁律（fixture 必须先在旧代码失败 / 永不 `innerHTML`，用 `parseHTML()` 走 `<template>` / 入仓前匿名化）
  - SingleFile 抓取流程
  - 如何更新 expected（删 → 跑 → review → commit）
  - 命名约定 `{category}--{scenario}.html`
- generic-article 测试拆分：
  - 保留现有 `generic-article.test.ts` 作为 mock 单元测试（验证错误码分支、payload 结构）
  - fixture-driver 测试跑**真** Defuddle，验证抽取质量
- 新增 `scripts/lint-capture-fixtures.mjs` 轻量隐私扫描（禁词 `cookie` / `token` / `Bearer` / `@gmail.com` / `@hotmail.com`），在 fixtures-driver 测试启动时跑一次；`pnpm test` 命中会失败
- 后续阶段（不在本提案范围）：按 B/C/D 层扩展（覆盖广度 / 已知棘手 / 边界破坏性），由后续提案承载

## Capabilities

### New Capabilities

- `capture-extractor-quality`: 定义 capture extractor 的长期质量保障契约——真实 HTML fixture + snapshot diff
  + 三条铁律 + 隐私扫描，作为后续 extractor 改动的回归门槛。

### Modified Capabilities

（无 — 不修改 `content-capture` 当前的行为约束，只新增质量保障维度）

## Impact

- **代码新增**：
  - `__tests__/extensions/chrome-capture/fixtures-driver.test.ts`（driver）
  - `__tests__/extensions/chrome-capture/fixtures/{category}--{scenario}.html`（5 个 spike）
  - `__tests__/extensions/chrome-capture/expected/{name}.md`（首次跑生成）
  - `scripts/lint-capture-fixtures.mjs`（隐私扫描）
- **代码改写**：
  - `__tests__/extensions/chrome-capture/fixtures/README.md`（替换占位 README）
  - 不动现有 `generic-article.test.ts` 等单元测试
- **依赖**：
  - 测试中 import Defuddle 的 Node 环境入口（`defuddle/node`）；当前 `pnpm build:extension` 已把 Defuddle bundle 进 `dist/`，但测试环境需要直接拿到 `defuddle/node` 模块——若未在 `package.json` `devDependencies` 中显式声明，本提案补一条
  - 不引入 SingleFile 为 npm 依赖（用户本地浏览器扩展，独立于工程依赖）
- **数据库**：无
- **不影响**：
  - capture capability 当前行为约束（`content-capture` spec 不变）
  - 扩展打包流程（`build:extension` 不动）
  - 现有路由 / API / 鉴权
- **回滚成本**：低。fixture-driver 测试与现有 mock 测试完全独立；删除新增文件即可回到当前状态。
- **关联文档**：`docs/decisions/0007-capture-extractor-test-architecture.md`（决策依据）。
