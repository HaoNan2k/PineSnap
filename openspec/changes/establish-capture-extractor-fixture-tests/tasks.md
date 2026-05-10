## 1. Spike：跑通管线（必须最先做，验证可行性）

- [x] 1.1 抓 1 个英文博客作为 `fixtures/generic--english-blog.html`（spike 阶段用 curl 抓 overreacted.io，SSR 完整；后续 fixture 走 SingleFile）
- [x] 1.2 在 HTML 顶部加 `<!-- {"url": "原始 URL", "capturedAt": "2026-05-10", "notes": "..."} -->` frontmatter
- [x] 1.3 隐私 lint 通过（无邮箱 / token / cookie 命中）
- [x] 1.4 ~~显式声明 `defuddle` 到 devDependencies~~ — 已经在 `~0.6.6`，跳过
- [x] 1.5 写最小化 `fixtures-driver.test.ts`：自动发现 + 跑真 Defuddle + 首次生成 baseline
- [x] 1.6 二次运行测试，确认 expected 与新输出严格相等
- [x] 1.7 故意篡改 expected 文件确认测试**失败**（基线机制拦得住回归）
- [x] 1.8 把 spike 心得追写进 `docs/decisions/0007-capture-extractor-test-architecture.md` 的"实施记录"小节

## 2. fixture-driver 完善

- [x] 2.1 driver 自动发现 `fixtures/generic--*.html`，按字母序遍历
- [x] 2.2 解析顶部 JSON frontmatter，提取 url / capturedAt；缺失则回退到 filename 推断
- [x] 2.3 expected 比对：JSON metadata（title / author / site / published / domain / wordCount）前置 + Markdown 正文
- [x] 2.4 测试名形如 `fixture: {name}`，便于 vitest 输出定位
- [x] 2.5 driver 启动时跑隐私 lint，命中即失败并输出文件名 + 行号 + 截短 snippet
- [x] 2.6 generic driver 仅覆盖 `generic--*` 前缀；site driver 推到 phase 2（见 §4）

## 3. 隐私扫描脚本

- [x] 3.1 `scripts/lint-capture-fixtures.mjs`：扫 `fixtures/**/*.html`
- [x] 3.2 禁词清单：cookie / set-cookie / authorization / Bearer / token query param / access-token / 邮箱正则（gmail/hotmail/outlook/qq/163/126/foxmail）/ 中文身份证号 / 中国大陆手机号
- [x] 3.3 命中输出文件名 + 行号 + 命中规则名 + 截短片段（≤80 字符），exit 1
- [x] 3.4 在 `package.json` 加 `"lint:fixtures": "node scripts/lint-capture-fixtures.mjs"`
- [x] 3.5 driver 测试启动时调用 `runLint()`，未通过抛错；脚本是单一真相，CLI 与测试共用

## 4. 站点 extractor 的真实 fixture（推到 phase 2）

站点 fixture 必须用 SingleFile 在已登录浏览器中抓取（涉及 hydration + 反爬 + 登录态），无法在
agent 工作流中独立完成。本提案先建立通用基础设施，site fixture 由后续提案承载。

下列任务**等第一个 site fixture 提交时**作为新提案 `extend-capture-fixture-coverage` 落实：

- [ ] 4.1 抓 `fixtures/bilibili--single-p.html`：选有官方字幕的稳定单 P 视频
- [ ] 4.2 抓 `fixtures/youtube--with-cc.html`：选有官方 CC 的英文教程
- [ ] 4.3 抓 `fixtures/wechat--article-normal.html`：从已登录浏览器抓某公众号普通图文，匿名化后入仓
- [ ] 4.4 抓 `fixtures/zhihu--answer.html`：高赞答案
- [ ] 4.5 写 `__tests__/extensions/chrome-capture/site-fixtures-driver.test.ts`：每站点独立 mock fetch（字幕接口）；driver 自动发现 site fixture 后调用对应 extractor
- [ ] 4.6 每个 site fixture 配 expected，首次自动生成，二次跑严格相等

**阻塞依赖**：用户提供至少 1 个 site fixture，触发新提案启动。本提案不阻塞合并。

## 5. README 改写（替换占位）

- [x] 5.1 顶部三条铁律（fixture 先失败 / 永不 innerHTML / 匿名化），逐条说明 + 为什么
- [x] 5.2 抓取流程：SingleFile 主路径 + curl 备选路径（明确仅适用于 SSR 站点）
- [x] 5.3 命名约定：`{category}--{scenario}.html`，category 限定枚举
- [x] 5.4 更新 expected 流程：删 → 跑 → review diff → commit
- [x] 5.5 故障 case 引用 Defuddle CLAUDE.md "Debugging strategy" 步骤
- [x] 5.6 删除占位 README 里"暂时拿不到可写 mock"的段（与 snapshot diff 模式不兼容）
- [x] 5.7 当前 fixture 清单 + 待补充清单（site fixture 列表）

## 6. generic-article 测试整理

- [x] 6.1 现有 `extractors/generic-article.test.ts` 保留，定位为"包装逻辑单元测试（mock Defuddle）"
- [x] 6.2 在该文件顶部加注释，说明真实抽取质量验证由 `fixtures-driver.test.ts` 承担
- [x] 6.3 不删除任何现有断言

## 7. CI 与本地工作流

- [x] 7.1 `pnpm test` 默认包含 fixture-driver 测试（vitest 默认匹配 `__tests__/**/*.test.ts`）
- [x] 7.2 README 中说明：抓新 fixture 后第一次 `pnpm test` 会生成 baseline 而非失败；review baseline 文件后再 commit
- [~] 7.3 ~~评估对 site fixture 加 `@flaky` 或单独 suite~~ — 推到 phase 2 与 site fixture 一起评估
- [x] 7.4 单 fixture 文件 ≤ 2MB（README 写明）；超出由 SingleFile 选项压缩或裁剪

## 8. 文档同步

- [x] 8.1 `docs/decisions/0007-capture-extractor-test-architecture.md` 状态 `draft → accepted`，加"实施记录"小节
- [x] 8.2 `docs/capture/chrome-extension.md` 第 §8 节"添加回归测试（snapshot diff）"，指向 fixtures README + 决策 0007
- [~] 8.3 OpenSpec 归档：`openspec validate --all --strict` 已绿（24/24）；归档由用户跑 `/openspec-archive-change`

## 9. 验证

- [~] 9.1 `pnpm typecheck`：本次改动相关文件 0 错误；项目预先存在 3 处与本次无关的错误（sidebar-history / remotion）
- [~] 9.2 `pnpm lint`：本次改动相关文件 0 错误；项目预先存在 9 处与本次无关的错误（e2e-bilibili-api-verify.ts / e2e-full-capture-pipeline.ts）
- [x] 9.3 `pnpm test`：全部 121 tests / 13 files 通过（含 fixture-driver 4 tests，含 lint:fixtures 在 driver 启动时跑）
- [x] 9.4 故意篡改 expected 文件，确认 fixture-driver 测试**失败**且失败信息能定位到具体 fixture（task 1.7 / 9.4 同覆盖）
- [x] 9.5 故意往 fixture 写入 `Authorization: Bearer abc123def456ghi789`，`pnpm lint:fixtures` 命中 2 条规则（authorization-header + bearer-token）并 exit 1
- [x] 9.6 中文用户验证步骤已输出（见会话末尾）
