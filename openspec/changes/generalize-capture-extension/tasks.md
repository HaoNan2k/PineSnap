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

- [ ] 4.1 新建 `shared/extractors/lib/dom-cleanup.js`：`expandLazyImages(doc)` / `removeSelectors(doc, selectors[])` / `stripTrackingParams(url)` / `normalizeSections(doc)`
- [ ] 4.2 `__tests__/extensions/chrome-capture/lib/dom-cleanup.test.ts`：每个工具函数 1-2 个 fixture
- [ ] 4.3 新建 `shared/extractors/generic-article.js`，provider 名 `generic_article_v1`
- [ ] 4.4 使用 Defuddle 从 `document` 抽取 `{ markdown, title, author, publishedAt, cover, wordCount }`
- [ ] 4.5 `sourceHtml` 快照：截取 `document.documentElement.outerHTML`，大小上限 500KB，超出截断并标注 diagnostics
- [ ] 4.6 输出 payload `artifact = { kind: "extracted_text", format: "markdown", content: {...}, isPrimary: true }`
- [ ] 4.7 抽取结果为空（markdown 长度 < 50 字符）时返回 `{ ok: false, code: "EXTRACT_EMPTY" }`
- [ ] 4.8 `__tests__/extensions/chrome-capture/extractors/generic-article.test.ts`：fixture（普通博客 HTML + SPA 文档站 HTML） → 断言 markdown 非空、title 提取、edge case `EXTRACT_EMPTY`

## 5. 微信公众号 extractor

- [ ] 5.1 新建 `shared/extractors/wechat-article.js`，provider 名 `wechat_article_v1`
- [ ] 5.2 首选策略：Defuddle 抽取 + 公众号 hook（去尾部推荐、修复 `data-src` 懒加载占位、标准化 `<section>` 嵌套）
- [ ] 5.3 从 `document` 拉取作者（公众号昵称）、发布时间、封面
- [ ] 5.4 输出 `extracted_text + format=markdown` 契约
- [ ] 5.5 URL 适配：`mp.weixin.qq.com/s` 路径命中
- [ ] 5.6 `__tests__/extensions/chrome-capture/fixtures/wechat-article-normal.html` + `wechat-article-deleted.html`
- [ ] 5.7 `__tests__/extensions/chrome-capture/extractors/wechat-article.test.ts`：fixture → 断言图片 src 正确、尾部推荐已去除

## 6. 知乎 extractor

- [ ] 6.1 新建 `shared/extractors/zhihu-answer.js`，provider 名 `zhihu_answer_v1`
- [ ] 6.2 首选策略：Defuddle 抽取 + 知乎 hook（展开折叠答案、去尾部相关推荐）
- [ ] 6.3 拉取作者、发布时间、赞同数到 `metadata.captureDiagnostics`
- [ ] 6.4 输出 `extracted_text + format=markdown` 契约
- [ ] 6.5 URL 适配：`zhihu.com/question/*/answer/*` 与 `zhuanlan.zhihu.com/p/*`
- [ ] 6.6 `__tests__/extensions/chrome-capture/fixtures/zhihu-answer.html` + `zhihu-zhuanlan.html`
- [ ] 6.7 `__tests__/extensions/chrome-capture/extractors/zhihu-answer.test.ts`：fixture → 断言折叠内容展开、作者字段非空

## 7. YouTube extractor（P1）

- [ ] 7.1 新建 `shared/extractors/youtube-subtitle.js`，provider 名 `youtube_subtitle_v1`
- [ ] 7.2 参照 `bilibili-full-subtitle.js` 模式：抓字幕 track 列表 → 下载首选语言字幕 → 构建 transcript lines
- [ ] 7.3 输出 `official_subtitle` 契约（复用视频型 schema）
- [ ] 7.4 URL 适配：`youtube.com/watch`
- [ ] 7.5 无字幕时返回 `NO_SUBTITLE_TRACK`（本次不做 ASR fallback）
- [ ] 7.6 `__tests__/extensions/chrome-capture/fixtures/youtube-with-cc.html` + `youtube-no-cc.html`
- [ ] 7.7 `__tests__/extensions/chrome-capture/extractors/youtube-subtitle.test.ts`：fixture → 断言字幕 lines 数、多语言首选选择

## 8. content.js 调度适配

- [ ] 8.1 根据 extractor 返回的 `artifact.kind` 组装上传 payload，分派到 article / video 两种映射
  - article：`kind: "extracted_text", format: "markdown", content: {...}` 直接打包
  - video：`kind: "official_subtitle" | "asr_transcript"` 沿用现有 mediaCandidates 路径
- [ ] 8.2 toast 文案泛化：B 站专用文案改为中性（"正在采集当前页..."）
- [ ] 8.3 按钮 mount 策略：所有站点都 mount 入口按钮，extractor 返回失败时 toast 降级提示
- [ ] 8.4 `describeTerminalFailure` 新增文章型错误码（`EXTRACT_EMPTY`、`EXTRACT_BLOCKED`、`NOT_AN_ARTICLE`）
- [ ] 8.5 引用集中错误码与 `isFallbackable`，移除 content.js 内联的 switch

## 9. Schema 层契约更新（`extracted_text` 复用，**不**新增 article_markdown）

- [ ] 9.1 `lib/capture/context.ts`：`webPageProviderContextSchema` 新增 `extractor` 字段，zod enum 值 `["generic_article_v1", "wechat_article_v1", "zhihu_answer_v1"]`
- [ ] 9.2 `inferJobTypeFromSource`：删除 `wechat_article` 分支（合并后只剩 `web_extract` 默认）；删除 `xiaohongshu` → `media_ingest` 映射（合并后走 `web_extract`）
- [ ] 9.3 `lib/capture/context.ts` 的 `captureSourceTypeSchema`：从 zod enum 中移除 `wechat_article` / `xiaohongshu`
- [ ] 9.4 验证 `app/api/capture/jobs/route.ts:29` 的 `artifactSchema.kind` 已包含 `extracted_text`（无需改动）

## 10. Prisma migration（删枚举值 + 数据迁移 + fingerprint 回填）

- [ ] 10.1 **预检 SQL**：登入目标 DB（`.env.local` 指向开发库），跑 `SELECT COUNT(*) FROM "CaptureJob" WHERE "jobType" = 'article_extract'` 与 `SELECT COUNT(*) FROM "Resource" WHERE "sourceType" IN ('wechat_article', 'xiaohongshu')` 与对应 Job
- [ ] 10.2 创建 migration `consolidate-article-extract-to-web-extract`：先 `UPDATE "CaptureJob" SET "jobType" = 'web_extract' WHERE "jobType" = 'article_extract'`，再 `ALTER TYPE "CaptureJobType" ...` 移除值
- [ ] 10.3 创建 migration `consolidate-non-video-source-types-to-web-page`：
  - UPDATE Resource / CaptureJob 的 sourceType 从 `wechat_article` / `xiaohongshu` 为 `web_page`
  - 回填 `Resource.sourceFingerprint = sha256("web_page:" || "canonicalUrl")`
  - 在 `CaptureJob.inputContext` 的 JSONB 中补 `providerContext.webPage.extractor` 字段（按原 sourceType 推断：`wechat_article` → `wechat_article_v1`，`xiaohongshu` → `xiaohongshu_v1`，目前没有 xiaohongshu extractor 则保持 null + 标记 `pending_extractor`）
  - 之后 `ALTER TYPE "CaptureSourceType" ...` 移除两值
- [ ] 10.4 migration down 路径：恢复枚举值（数据级别不强制回填，记入 migration 注释说明限制）
- [ ] 10.5 在本地开发库跑 migration，验证：所有 Resource sourceType 全为 video / web_page；fingerprint 已更新；后续 POST 同一 URL 命中幂等

## 11. Worker dispatcher 泛化

- [ ] 11.1 `worker/main.ts`：`processBatch` 中移除 `jobType: "audio_transcribe"` 硬编码
- [ ] 11.2 引入 `JOB_HANDLERS: Map<CaptureJobType, JobHandler>`，初始注册 `audio_transcribe → processAudioTranscribeJob`
- [ ] 11.3 dispatch 时按 `job.jobType` 查 map，未注册的 jobType 标记 `FAILED` + `errorCode: "UNSUPPORTED_JOB_TYPE"`
- [ ] 11.4 **不实现** `web_extract` handler（无调用方 = 死代码），在 TODOS.md 中明确该项作为未来工作
- [ ] 11.5 `__tests__/worker/dispatcher.test.ts`：测 audio_transcribe 路径不变 + 未注册 jobType 走 UNSUPPORTED 分支

## 12. Token scope 兼容（迁移期）

- [ ] 12.1 `lib/db/capture-token.ts`：在 `verifyCaptureToken` 的 scope 校验处增加别名映射：`capture:wechat_article` 与 `capture:xiaohongshu` 视为包含 `capture:web_page`
- [ ] 12.2 加注释标注此为迁移期兼容代码，附 sunset 时间（建议 3 个月后清理）

## 13. CORS 与发布联调

- [ ] 13.1 获取新扩展 ID（`chrome://extensions/` 加载 unpacked `chrome-capture` 后读取）
- [ ] 13.2 更新本地 `.env.local` 的 `CAPTURE_CORS_ALLOWED_ORIGINS`，添加新扩展 origin
- [ ] 13.3 保留旧扩展 origin 一段迁移期（验收通过后再移除）

## 14. 文档更新

- [ ] 14.1 `docs/capture/chrome-extension.md` 重写：从"B 站字幕手册"改为"多源扩展手册"，新增 SITE_ADAPTERS 与 extractor 契约章节
- [ ] 14.2 `docs/capture/context-and-job-model.md`：更新 jobType / sourceType 取值列表，补 `webPage.extractor` 字段
- [ ] 14.3 `docs/platform/database-data-dictionary.md`：反映 `CaptureSourceType` / `CaptureJobType` 枚举变更
- [ ] 14.4 `TODOS.md` 增列：服务端 `web_extract` Defuddle 抓取（解锁移动端 share / 邮件转发 / API 入口）；扩展 lazy load Defuddle 优化

## 15. 端到端验收

- [ ] 15.1 验收 URL 1（普通博客 overreacted.io）：通用兜底成功，markdown 完整
- [ ] 15.2 验收 URL 2（中文博客）：处理中文字符与代码块
- [ ] 15.3 验收 URL 3（微信公众号文章）：图片懒加载正常，尾部推荐被去除
- [ ] 15.4 验收 URL 4（知乎专栏 `zhuanlan.zhihu.com/p/...`）：折叠内容展开，作者 / 发布时间正确
- [ ] 15.5 验收 URL 5（YouTube 视频）：字幕成功抓取
- [ ] 15.6 验收 URL 6（SPA 文档站 react.dev）：通用兜底在已渲染 DOM 上工作
- [ ] 15.7 回归 URL 7（B 站视频）：行为与重构前一致（引用 fixture 测试 + 实站点二次确认）
- [ ] 15.8 失败路径：在 about:blank / Gmail 点击扩展，错误提示清晰不崩
- [ ] 15.9 学习模块读取：验收 URL 1 / 3 / 4 的 `extracted_text` 能被 learning 流程识别为正文
- [ ] 15.10 旧扩展 token 兼容：用旧 token 调用新扩展（带 `capture:wechat_article` scope 的 token 走 web_page 请求 → 200）
- [ ] 15.11 全量 vitest 通过：`pnpm test` 0 失败

## 16. 提交与沉淀

- [ ] 16.1 按功能分支规范提交（`feat/generalize-capture-extension`）
- [ ] 16.2 评估是否触发 `sediment-doc`：本次涉及 schema 合并决策、扩展架构契约、双形态 extractor 分层，建议沉淀到 `docs/decisions/`
- [ ] 16.3 运行 `/openspec-archive-change generalize-capture-extension` 归档
