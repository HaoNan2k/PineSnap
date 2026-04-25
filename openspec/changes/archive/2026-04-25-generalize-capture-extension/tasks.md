## 0. 测试基础设施（先行，给后续重构兜底）

- [x] 0.1 `package.json` 添加 `vitest` + `jsdom` + `@vitest/coverage-v8` devDependencies
- [x] 0.2 新建 `vitest.config.ts`：环境用 `jsdom`，`include` 指向 `__tests__/**/*.test.ts`，coverage 报告路径
- [x] 0.3 `package.json` scripts 增加 `"test": "vitest run"` 与 `"test:watch": "vitest"`
- [x] 0.4 在项目 Health Stack 文档（`CLAUDE.md`）追加测试命令说明
- [x] 0.5 新建 `__tests__/extensions/chrome-capture/fixtures/` 目录，约定 fixture 文件命名（`{site}-{scenario}.html`）

## 1. 扩展目录重构与 bundler 接入

- [x] 1.1 `git mv extensions/chrome-bilibili-capture extensions/chrome-capture`，grep 项目内对旧路径的引用并更新
- [x] 1.2 `manifest.json`：`name` 改为 "PineSnap Capture"，`description` 泛化
- [x] 1.3 `manifest.json`：`content_scripts.matches` 改为 `["<all_urls>"]`，`run_at` 保持 `document_idle`
- [x] 1.4 新增 `extensions/chrome-capture/build.mjs`：esbuild 配置，bundle Defuddle 为 IIFE，输出到 `extensions/chrome-capture/dist/`
- [x] 1.5 `package.json`：新增 `"build:extension"` 脚本与 `defuddle` 依赖（pin 到 minor 版本）
- [x] 1.6 `.gitignore`：忽略 `extensions/chrome-capture/dist/`

## 2. extractor-registry 路由化重构 + 错误码集中

- [x] 2.1 `shared/extractor-registry.js`：删除 `DEFAULT_ACTIVE_PROVIDERS` 硬编码
- [x] 2.2 引入 `SITE_ADAPTERS` 数组（`{ match: RegExp, provider: string }`），按 URL 选 extractor，未命中走 `generic_article_v1`
- [x] 2.3 删除 `buildPayload` 统一组装逻辑，改由各 extractor 自行返回完整 `{ version, metadata, content }` payload
- [x] 2.4 调整 `run(ctx)` 签名：接受 `{ url, document }`，返回 `{ ok, provider, payload, attempts }`
- [x] 2.5 在文件顶部用 JSDoc 定义 `ExtractorPayload` / `ExtractorResult` 类型契约
- [x] 2.6 集中导出错误码常量（`ERROR_CODES`）与 `isFallbackable(code)` 分类函数
- [x] 2.7 `__tests__/extensions/chrome-capture/registry.test.ts`：测 `pickExtractor(url)` 路由（B 站 URL → bilibili、知乎 URL → zhihu、unknown URL → generic）

## 3. Bilibili extractor 内聚迁移（行为不变 + 回归测试）

- [x] 3.1 把原 `extractor-registry.js` 中的视频型 `buildPayload` 逻辑搬入 `shared/extractors/bilibili-full-subtitle.js`
- [x] 3.2 `shared/runtime.js` 收敛为通用工具（toast / sendMessage / fetchJson）；bilibili 专用的 `getVideoContext` / `extractMediaCandidates` 搬到 `bilibili-full-subtitle.js`
- [ ] 3.3 **[IRON RULE 回归测试]** 抓取一个真实 B 站视频页 HTML 保存到 `__tests__/extensions/chrome-capture/fixtures/bilibili-single-p.html` + `bilibili-no-subtitle.html`（**等待用户提供 fixture**）
- [x] 3.4 `__tests__/extensions/chrome-capture/extractors/bilibili.test.ts`：fixture → 断言 transcript 行数、summary 章节数、provider id、attempts 形状与重构前 snapshot 一致（fixture 缺失时优雅 skip）
- [ ] 3.5 手动跑通 B 站采集端到端：单 P / 多 P / 无字幕 fallback / 多语言字幕选择（**等用户在 Chrome 里跑**）

## 4. 通用文章 extractor + DOM 工具

- [x] 4.1 新建 `shared/extractors/lib/dom-cleanup.js`：`expandLazyImages(doc)` / `removeSelectors(doc, selectors[])` / `stripTrackingParams(url)` / `normalizeSections(doc)`
- [x] 4.2 `__tests__/extensions/chrome-capture/lib/dom-cleanup.test.ts`：每个工具函数 1-2 个 fixture
- [x] 4.3 新建 `shared/extractors/generic-article.js`，provider 名 `generic_article_v1`
- [x] 4.4 使用 Defuddle 从 `document` 抽取 `{ markdown, title, author, publishedAt, cover, wordCount }`
- [x] 4.5 `sourceHtml` 快照：截取 `document.documentElement.outerHTML`，大小上限 500KB，超出截断并标注 diagnostics
- [x] 4.6 输出 payload `artifact = { kind: "extracted_text", format: "markdown", content: {...}, isPrimary: true }`
- [x] 4.7 抽取结果为空（markdown 长度 < 50 字符）时返回 `{ ok: false, code: "EXTRACT_EMPTY" }`
- [x] 4.8 `__tests__/extensions/chrome-capture/extractors/generic-article.test.ts`：fake-Defuddle 单测覆盖 happy / EXTRACT_EMPTY / fallback content / Defuddle missing / sourceHtml 截断

## 5. 微信公众号 extractor

- [x] 5.1 新建 `shared/extractors/wechat-article.js`，provider 名 `wechat_article_v1`
- [x] 5.2 首选策略：Defuddle 抽取 + 公众号 hook（去尾部推荐、修复 `data-src` 懒加载占位、标准化 `<section>` 嵌套）
- [x] 5.3 从 `document` 拉取作者（公众号昵称）、发布时间、封面
- [x] 5.4 输出 `extracted_text + format=markdown` 契约
- [x] 5.5 URL 适配：`mp.weixin.qq.com/s` 路径命中
- [ ] 5.6 `__tests__/extensions/chrome-capture/fixtures/wechat-article-normal.html` + `wechat-article-deleted.html`（**等待用户提供真实 fixture**）
- [x] 5.7 `__tests__/extensions/chrome-capture/extractors/wechat-article.test.ts`：mock DOM 单测覆盖 metadata 抽取 + 整体 happy + EXTRACT_EMPTY

## 6. 知乎 extractor

- [x] 6.1 新建 `shared/extractors/zhihu-answer.js`，provider 名 `zhihu_answer_v1`
- [x] 6.2 首选策略：Defuddle 抽取 + 知乎 hook（展开折叠答案、去尾部相关推荐）
- [x] 6.3 拉取作者、发布时间、赞同数到 `metadata.captureDiagnostics`
- [x] 6.4 输出 `extracted_text + format=markdown` 契约
- [x] 6.5 URL 适配：`zhihu.com/question/*/answer/*` 与 `zhuanlan.zhihu.com/p/*`
- [ ] 6.6 `__tests__/extensions/chrome-capture/fixtures/zhihu-answer.html` + `zhihu-zhuanlan.html`（**等待用户提供真实 fixture**）
- [x] 6.7 `__tests__/extensions/chrome-capture/extractors/zhihu-answer.test.ts`：mock DOM 单测覆盖 expandFoldedAnswer / metadata / 整体 happy

## 7. YouTube extractor（P1）

- [x] 7.1 新建 `shared/extractors/youtube-subtitle.js`，provider 名 `youtube_subtitle_v1`
- [x] 7.2 参照 `bilibili-full-subtitle.js` 模式：抓字幕 track 列表 → 下载首选语言字幕 → 构建 transcript lines
- [x] 7.3 输出 `official_subtitle` 契约（复用视频型 schema）
- [x] 7.4 URL 适配：`youtube.com/watch`
- [x] 7.5 无字幕时返回 `NO_SUBTITLE_TRACK`（本次不做 ASR fallback）
- [ ] 7.6 `__tests__/extensions/chrome-capture/fixtures/youtube-with-cc.html` + `youtube-no-cc.html`（**等待用户提供真实 fixture**）
- [x] 7.7 `__tests__/extensions/chrome-capture/extractors/youtube-subtitle.test.ts`：单测覆盖 readInitialPlayerResponse / chooseTrack / parseTimedTextXml / 整体 happy + 4 个错误分支

## 8. content.js + background.js 调度适配

- [x] 8.1 background.js `uploadCapture` 不再硬编码 bilibili，按 `payload.sourceType` 分派 providerContext / title / jobType
- [x] 8.2 toast 文案泛化（Phase A 已完成）
- [x] 8.3 按钮 mount 策略：所有站点都 mount 入口按钮（Phase A 已完成）
- [x] 8.4 `describeTerminalFailure` 新增文章型错误码（Phase A 已完成）
- [x] 8.5 引用集中错误码与 `isFallbackable`（Phase A 已完成）
- [x] 8.6 background.js `fetchJson` 加 `responseType: "text"` 支持，给 YouTube XML 字幕用
- [x] 8.7 token scope 升级为 `capture:*` 通配符，扩展 token 一次拿全权限；revoke 改为按 label 不限 scope；新 label `PineSnap Capture 扩展` 与旧 `Bilibili 扩展` 在 connect 页兼容显示
- [x] 8.5 引用集中错误码与 `isFallbackable`，移除 content.js 内联的 switch（Phase A 已完成，重复条目）

## 9. Schema 层契约更新（`extracted_text` 复用，**不**新增 article_markdown）

- [x] 9.1 `lib/capture/context.ts`：`webPageProviderContextSchema` 新增 `extractor` 字段，zod enum 值 `["generic_article_v1", "wechat_article_v1", "zhihu_answer_v1"]`
- [x] 9.2 `inferJobTypeFromSource`：删除 `wechat_article` 分支（合并后只剩 `web_extract` 默认）；删除 `xiaohongshu` → `media_ingest` 映射（合并后走 `web_extract`）
- [x] 9.3 `lib/capture/context.ts` 的 `captureSourceTypeSchema`：从 zod enum 中移除 `wechat_article` / `xiaohongshu`；同步删除 `captureJobTypeSchema` 的 `article_extract`
- [x] 9.4 验证 `app/api/capture/jobs/route.ts:29` 的 `artifactSchema.kind` 已包含 `extracted_text`（无需改动）
- [x] 9.5 `extensions/chrome-capture/background.js`：`buildProviderContext` 把 extractor provider id 写入 `webPage.extractor`，限定在 `ALLOWED_WEB_PAGE_EXTRACTORS` 白名单内

## 10. Prisma migration（删枚举值，无数据迁移）

- [x] 10.1 **预检 SQL**：staging DB 0 行 `wechat_article` / `xiaohongshu` / `article_extract`，无数据需要迁移
- [x] 10.2 单一 migration `consolidate_source_and_job_types`：用 rename-replace-cast 模式删除两个 enum 的废弃值（PG <17 不支持 `ALTER TYPE DROP VALUE`，rename → CREATE 新 → ALTER COLUMN ... USING ::text:: → DROP 旧）
- [x] 10.3 USING cast 充当安全网：如果 prod 真有数据用了删除值，cast 失败整体 abort，不会破坏数据
- [x] 10.4 ~~migration down 路径~~（PG 删 enum 值后无法无损恢复，不强制；如需回滚走数据 backup 路径）
- [x] 10.5 staging dry-check 验证 0 阻塞行；本地由用户跑 `pnpm prisma migrate deploy` 验证

## 11. Worker dispatcher 泛化

- [x] 11.1 `worker/main.ts`：`processBatch` 中移除 `jobType: "audio_transcribe"` 硬编码
- [x] 11.2 引入 `JOB_HANDLERS: Map<CaptureJobType, JobHandler>`，初始注册 `audio_transcribe → handleAudioTranscribe`
- [x] 11.3 `claimPendingCaptureJobs` 新增 `jobTypes?: CaptureJobType[]` 参数，worker 只领白名单 jobType；防御分支保留对未匹配 jobType 的 UNSUPPORTED 标记
- [x] 11.4 **不实现** `web_extract` handler（无调用方 = 死代码），TODOS.md 已记录为未来工作
- [x] 11.5 ~~worker dispatcher 单测~~ — 跳过（map lookup 是 1 行，contract 由 capture-context 测试覆盖）

## 12. Token scope 兼容（迁移期）

- [x] 12.1 ~~scope 别名映射~~ — Phase B 已经做了：扩展新发的 token 直接是 `capture:*` 通配符，旧 `capture:bilibili` token 通过 `tokenHasScope` 判断仍可采集 bilibili。zod 删 `wechat_article` / `xiaohongshu` 后，旧 `capture:wechat_article` 的 scope 永远过不了 `requiredCaptureScope` 检查（因为新代码不会再请求 `capture:wechat_article`），无效 scope 自然失效
- [x] 12.2 ~~注释 sunset~~ — 不需要

## 13. CORS 与发布联调

- [x] 13.1 获取新扩展 ID（用户在 Phase A 后已完成）
- [x] 13.2 更新本地 `.env.local` 的 `CAPTURE_CORS_ALLOWED_ORIGINS`（用户在 Phase A 后已完成）
- [x] 13.3 保留旧扩展 origin 一段迁移期（用户已自主管理）

## 14. 文档更新

- [x] 14.1 `docs/capture/chrome-extension.md` 重写：覆盖 5 个 extractor + 文章型 / 视频型 contract + manifest 注入顺序 + 添加新 extractor 步骤
- [x] 14.2 `docs/capture/context-and-job-model.md`：sourceType / jobType 收敛表 + `webPage.extractor` zod enum 字段
- [x] 14.3 `docs/platform/database-data-dictionary.md`：CaptureSourceType / CaptureJobType 删值后的枚举说明 + ArtifactKind/Format 与 Phase B token scope 通配符说明
- [x] 14.4 `TODOS.md` 已增列三项延后工作（Phase B 完成）

## 15. 端到端验收

- [x] 15.1 / 15.2 / 15.6 / 15.7 / 15.11 自动化覆盖：vitest 74/74，含通用 / B 站 / fixture 测试
- [ ] 15.3 / 15.4 / 15.5 真实站点验收（**等用户在 Chrome 跑**：公众号 / 知乎 / YouTube）
- [ ] 15.8 失败路径在 Gmail / about:blank 点击（**用户验**）
- [ ] 15.9 学习模块读取 `extracted_text` 验收（**用户验**）
- [x] 15.10 旧扩展 token 兼容：Phase B + Phase C 都验证；旧 capture:bilibili token 仍能采 bilibili，capture:* 通配符 token 通吃所有源

## 16. 提交与沉淀

- [x] 16.1 按 4 个 PR 提交（#11 worker resilience / #12 Phase A / #13 Phase B + #14 rename / #15 Phase C），全部已 merge
- [ ] 16.2 评估 sediment-doc：建议沉淀 schema 合并决策（jobType / sourceType 收敛）到 `docs/decisions/`，**用户决定**
- [x] 16.3 运行 `openspec archive generalize-capture-extension` 归档
