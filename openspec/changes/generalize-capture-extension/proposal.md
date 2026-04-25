## Why

当前 Chrome 扩展只覆盖 B 站视频字幕采集，但 schema、`CaptureContext` 契约和扩展的 `extractor-registry` 模式已经为多源设计，被两处硬编码限制了扩展能力：`manifest.json` 的 `matches` 只匹配 `bilibili.com/video/*`，`extractor-registry.js` 的 `DEFAULT_ACTIVE_PROVIDERS` 只激活 bilibili extractor。用户核心素材（博客、微信公众号、知乎专栏、YouTube）目前完全无法进入产品。

PineSnap 的学习 / 讨论 / AI 加工模块价值只有在"素材进得来"之后才能体现。打通多源是把其他模块激活的入场券。

## What Changes

### 扩展侧
- **扩展重命名与注入范围放开**：`chrome-bilibili-capture` → `chrome-capture`，`manifest.json` 的 `content_scripts.matches` 改为 `<all_urls>`。**BREAKING**：已安装扩展的用户需重新安装新版（扩展 ID 变更）。
- **extractor-registry 路由方式重构**：由"启动时激活 provider"改为"按当前页 URL 选 extractor"，用 `SITE_ADAPTERS` 正则数组映射，无匹配时走通用兜底。
- **Registry 职责收窄**：取消统一 `buildPayload`，各 extractor 自己返回完整 payload。
- **共享工具抽取**：新增 `shared/extractors/lib/dom-cleanup.js` 承载跨 extractor 的 DOM 清洗逻辑。错误码常量与 fallback 分类函数在 `shared/extractor-registry.js` 集中。

### 抽取器
- **P0 extractor**：
  - `generic-article`：通用兜底，使用 Defuddle 抽取文章型内容
  - `wechat-article`：微信公众号（`mp.weixin.qq.com/s`）
  - `zhihu-answer`：知乎答案 / 专栏
- **P1 extractor**：`youtube-subtitle`，沿用 bilibili 视频型 artifact 契约

### 输出契约（复用现有枚举）
- **文章型**：`CaptureArtifact.kind = "extracted_text"` + `format = "markdown"`。复用已存在的枚举值（不新增 `article_markdown`），`content` 结构：`{markdown, title, author?, publishedAt?, cover?, sourceHtml?, wordCount?}`。
- **视频型**：沿用现有 `official_subtitle` / `asr_transcript`，形状不变。

### Schema 合并（**BREAKING**，含数据迁移）
- **`CaptureJobType`**：删除 `article_extract`，所有文章型作业统一使用 `web_extract`。存量 `article_extract` 的 Job 记录在 migration 中 UPDATE 为 `web_extract`。
- **`CaptureSourceType`**：删除 `wechat_article` / `xiaohongshu`（保留 `bilibili` / `youtube` / `douyin` / `web_page`）。存量 `wechat_article` / `xiaohongshu` 的 Resource + Job 在 migration 中 UPDATE 为 `web_page`，同时回填 `sourceFingerprint` 与补齐 `providerContext.webPage.extractor` 标记。
- **Token scope**：存量 `capture:wechat_article` / `capture:xiaohongshu` scope 的 token 在迁移期增加别名映射到 `capture:web_page`，避免扩展请求 401（solo 环境也可选择强制重新授权）。

### providerContext.webPage 扩展
- 新增 `extractor` 字段（zod enum：`generic_article_v1` / `wechat_article_v1` / `zhihu_answer_v1` / ...），用于在同一 `web_page` sourceType 下区分具体站点抽取器。

### Worker
- **Worker dispatcher 泛化**：`worker/main.ts` 的 `jobType: "audio_transcribe"` 硬编码改为 `jobType → handler` map。只注册 `audio_transcribe` handler；`web_extract` 等未注册的 jobType 仍走 `UNSUPPORTED_JOB_TYPE` 路径，**本 PR 不实现 Defuddle 服务端抓取**（没有调用方，避免死代码）。

### 测试基础设施（新增）
- 引入 `vitest` + `jsdom`（通过 `package.json` + `vitest.config.ts`），对齐项目 Health Stack（扩展现有 `tsc --noEmit` + `eslint`）。
- 每个 extractor 至少两个 HTML fixture 测试（happy + 边界）。工具函数（dom-cleanup）与 registry 路由函数（pickExtractor）补齐单测。

### 保持不变
- bilibili extractor 的对外契约与 artifact 结构：单 P / 多 P / 字幕 fallback 行为完全一致。
- 服务端 `POST /api/capture/jobs` 请求体形状（`extracted_text` 已在 zod enum 内，无契约变更）。

## Capabilities

### New Capabilities

*无。本次变更均在既有 `content-capture` 范围内扩展。*

### Modified Capabilities

- `content-capture`：
  - 采集入口 MUST 按 URL 路由到对应 extractor，未命中走通用兜底
  - 文章型 CaptureArtifact 使用 `extracted_text + format=markdown`（新增 content 结构约束）
  - `web_extract` jobType 的合并语义（删除 `article_extract`）
  - 多站点归一到 `web_page` sourceType + `webPage.extractor` 区分（删除 `wechat_article` / `xiaohongshu`）
  - Worker dispatcher 按 jobType 分派，未注册的 jobType 标 `UNSUPPORTED_JOB_TYPE`

## Impact

**代码范围：**
- `extensions/chrome-bilibili-capture/` → `extensions/chrome-capture/`（目录重命名）
- `extensions/chrome-capture/shared/extractors/`：新增 4 个 extractor 文件 + `lib/dom-cleanup.js`
- `extensions/chrome-capture/shared/extractor-registry.js`：重写
- `lib/capture/context.ts`：`inferJobTypeFromSource` 去掉 wechat_article / xiaohongshu 分支；`webPageProviderContextSchema` 增 `extractor` 字段
- `worker/main.ts`：dispatcher 泛化
- `lib/db/capture-token.ts`：scope 兼容别名（迁移期）
- `prisma/schema.prisma` + 两个 migration：删除枚举值 + 存量数据 UPDATE + fingerprint 回填
- `__tests__/extensions/chrome-capture/`：新增 fixture 测试目录
- `vitest.config.ts` + `package.json`：测试基础设施

**依赖：**
- 新增：`defuddle`（扩展 bundle + pin 到 minor），`vitest`、`jsdom`（devDependencies）
- 扩展构建：引入 esbuild

**文档：**
- `docs/capture/chrome-extension.md`：从"B 站字幕手册"改写为"多源扩展手册"
- `docs/capture/context-and-job-model.md`：更新 providerContext / jobType / sourceType 取值
- `docs/platform/database-data-dictionary.md`：反映 sourceType / jobType 枚举变更

**用户侧影响：**
- 已安装旧扩展：卸载 + 安装新版，扩展 ID 变更后更新 `CAPTURE_CORS_ALLOWED_ORIGINS`
- 历史 Resource 中 `sourceType = wechat_article / xiaohongshu` 的条目会在 migration 后变为 `sourceType = web_page`，卡片展示如需保留"公众号"徽标需读取 `providerContext.webPage.extractor` 判断
