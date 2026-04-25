## Context

**当前状态：**

- Chrome 扩展 `extensions/chrome-bilibili-capture/` 是 MV3 + content script + background fetch 架构，已具备完整的鉴权、CORS、上传流程
- `shared/extractor-registry.js` 实现"多 extractor 按 priority 链式尝试"，但所有逻辑假设输出为视频型 artifact
- `shared/extractors/` 只有 `bilibili-full-subtitle.js`
- `lib/capture/context.ts:130-135` 已定义 `web_page → web_extract` 与 `wechat_article → article_extract` 的 jobType 映射
- `prisma/schema.prisma`：`CaptureSourceType` 枚举包含 `web_page`、`youtube`、`wechat_article`、`xiaohongshu` 等；`CaptureArtifactKind` 已含 `extracted_text`；`CaptureArtifactFormat` 已含 `markdown`；`CaptureJobType` 同时含 `web_extract` 与 `article_extract`（语义重叠）
- `worker/main.ts:55-56` 硬编码 `jobType: "audio_transcribe"`，dispatcher 形态尚未具备
- `app/api/capture/jobs/route.ts:144-163` 提供"扩展预抽 → 同步落 Artifact"的通用路径，任何 `kind` 都能落

**研究结论：**

| 维度 | 共识 |
|------|------|
| 抽取位置 | 扩展端 DOM > 服务端 fetch URL（已渲染、已登录、绕过付费墙）|
| 抽取算法 | 启发式 > LLM（Readability / Defuddle 中位数 0.97，LLM 抽正文又贵又差）|
| 抽取库 | Defuddle（2025 Obsidian 团队开源），活跃维护 + LinkedIn / Threads / Bluesky / Medium 专用适配 |
| 存储格式 | Markdown + 原始 HTML 快照（为未来重抽留退路）|
| 站点定制 | 通用兜底 + top 站点专用规则，是所有强产品的共同形态 |

**中文圈约束：** Defuddle / Readability 是英文互联网调优的，对中文高粘度站点（公众号、知乎）效果显著低于英文站点。PineSnap 面向中文用户，通用兜底 + 微信公众号 + 知乎三件套构成中文圈最小可用集。

## Goals / Non-Goals

**Goals:**

- 打通"通用网页"作为一等采集源，Defuddle 处理博客 / 文档 / 新闻
- 微信公众号、知乎、YouTube 作为 P0/P1 站点定制 extractor
- 扩展架构从"单源"演进为"按 URL 路由 + 可扩展 extractor"，bilibili 行为零回归
- 输出契约按形态分层：文章型用 `extracted_text + format=markdown`，视频型沿用 `official_subtitle` / `asr_transcript`
- 删除 `article_extract` 与 `wechat_article` / `xiaohongshu` 等冗余枚举值，schema 收敛到一个文章型 jobType + 一个非视频 sourceType
- Worker dispatcher 泛化为 `jobType → handler` map（结构到位，不写死代码）
- 引入 vitest + 全量 extractor fixture 测试，建立首条前端单测基线

**Non-Goals:**

- 不做小红书 / Twitter / X 线程 / GitHub README 的专用 extractor
- 不做移动端 share extension
- 不实现 `web_extract` 服务端 Defuddle 抓取（无调用方 = 死代码，留作未来变更）
- 不引入 headless 浏览器做服务端渲染兜底
- 不把扩展从 vanilla JS 迁到 TypeScript（用 JSDoc 类型即可，避免扩展构建复杂度）

## Decisions

### 决策 1：复用 `extracted_text` + `format=markdown`，不新增 artifact kind

**对比：**

| 方案 | 优点 | 缺点 |
|------|------|------|
| 新增 `article_markdown` | 名称语义最强 | 与已有 `extracted_text` 重叠，引入冗余枚举 + 一次 prisma migration |
| **复用 `extracted_text + format=markdown`** ✅ | 0 schema 变更，符合最小 diff 原则 | 名称略弱，需文档说明 |

**理由：** `extracted_text` + `format=markdown` 完整表达"抽取出来的文本，格式为 Markdown"。新增枚举是把已存在的语义再说一遍。

### 决策 2：合并 `article_extract` 到 `web_extract`，统一为一个文章型 jobType

`CaptureJobType.article_extract` 与 `web_extract` 在运行时无任何 handler 区分它们，纯属命名冗余。

**对比：**

| 方案 | 优点 | 缺点 |
|------|------|------|
| **合并到 `web_extract`** ✅ | 单一概念，无歧义 | 需 migration（先 UPDATE 存量行，再删枚举值）|
| 保留两个 + 文档区分 | 不动 schema | 长期会被误用 |

**理由：** 既然要"一次到位"，就不留下一个未来要回头清理的命名坑。

### 决策 3：合并所有非视频 sourceType 到 `web_page`，靠 `providerContext.webPage.extractor` 区分

`wechat_article` / `xiaohongshu` 是历史早期升格为 sourceType 的，结果每加一个站点都要 migration。

**对比：**

| 方案 | 优点 | 缺点 |
|------|------|------|
| **合并到 `web_page` + extractor 字段** ✅ | 加站点 0 migration，模型一致 | 一次性 migration 工作量大（含数据迁移 + fingerprint 回填）|
| 保留 wechat_article 为特例 | 不动存量 | 模型不极致一致 |
| 每个新站点独立 sourceType | sourceType 自带语义 | 每站一次 migration，长期不可持续 |

**理由：** 用户明确选了"最彻底"路线（A+）。代价是这次 migration 必须把 fingerprint 回填、token scope 兼容做对。

### 决策 4：Worker dispatcher 泛化（结构到位，handler 不灌水）

把 `worker/main.ts:55-56` 的硬编码 `jobType: "audio_transcribe"` 改为 `JOB_HANDLERS: Map<CaptureJobType, JobHandler>`。本 PR 只注册 `audio_transcribe` 一个 handler。

**理由：**

- 当前的硬编码是"假泛化"，新 jobType 进来会直接 FAILED，bug 隐患
- 真正的 dispatcher 模式是 ~30 行代码的结构改造，不是新功能
- **不实现 `web_extract` Defuddle 抓取**：本 PR 的扩展端会同步把 `artifact` 塞进 `POST /api/capture/jobs`，服务端走 `route.ts:144-163` 直接落 Artifact，根本不进 worker 队列。没有调用方就不写代码，YAGNI

### 决策 5：抽取库选 Defuddle

| 库 | 语言 | 维护 | 评分 |
|----|------|------|------|
| Mozilla Readability | JS | 低活跃度 | 中位数 0.97 |
| **Defuddle** ✅ | JS | 高活跃度（Obsidian 团队，2025 开源）| 接近 Readability，主动加站点适配 |
| Trafilatura | Python | 高活跃度 | 平均 0.88 |

**理由：** 必须 JS（扩展端），Defuddle 是 Readability 的现代继任者，原生 Markdown 输出，且 Obsidian 团队的站点适配可未来借用。

### 决策 6：扩展 bundler 选 esbuild

Defuddle 是 ES Module，MV3 content script 不支持 ESM import，必须 bundle 为 IIFE。esbuild 配置最轻、构建最快。

### 决策 7：测试基础设施前置（vitest + jsdom）

**理由：**

- 项目当前只有 `tsc --noEmit` + `eslint`，没有任何运行时测试。bilibili refactor 是 IRON RULE 触发的回归路径，必须有测试兜底
- extractor 是纯函数（HTML DOM → 结构化），fixture 测试投入产出比极高
- 中文圈站点（公众号、知乎）改版频率高，没有 fixture 测试会默默炸
- 为后续 `redesign-canvas-chat-ux-language` 等变更打基础（TODOS.md 已存在"引入前端测试框架"的策略 TODO）

### 决策 8：路由方式 —— manifest matches 统一 + registry 按 URL 动态选

| 方案 | 优点 | 缺点 |
|------|------|------|
| manifest 多 matches 注入不同脚本 | 启动时只加载需要的 | 新加站点要动 manifest（重新安装），维护分散 |
| **manifest `<all_urls>` + registry 路由** ✅ | 统一管理，新增站点只改 JS | 每页都注入，性能与隐私要规划 |

**理由：** Defuddle / Obsidian Web Clipper 用同模式，业界主流；维护成本最低。

### 决策 9：Token scope 迁移期兼容

合并 sourceType 后，存量 `CaptureToken` 携带的 `capture:wechat_article` / `capture:xiaohongshu` scope 会失效。

**方案：** `verifyCaptureToken` 增加别名映射，旧 scope 视为包含 `capture:web_page`。注释标注 sunset 时间（建议 3 个月后清理）。

solo 环境也可选择强制重新授权，但别名兼容更优雅，避免用户中断使用。

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| 扩展在所有网站注入 content script，影响页面性能 | 最小注入策略：mountButton 阶段 < 5ms（只加按钮 + 监听器），Defuddle 等抽取器在用户点击后才执行 |
| 扩展可读取所有页面 DOM 的隐私顾虑（银行 / 医疗 / 工作文档）| 严守"被动行为"边界：不在用户点击前读 DOM 内容，错误日志不夹带页面文本，扩展商店说明页明确告知 |
| Chrome 商店审核对 `<all_urls>` 权限审核更严，扩展安装提示也会变可怕 | manifest description 明确说明用途；项目目前是 unpacked 个人使用，无审核压力，未来如发布需准备文案 |
| Defuddle 对中文站点抽取低于英文 | 公众号、知乎已专用 extractor 兜底；通用 Defuddle 失败时降级 `EXTRACT_EMPTY` 提示 |
| 扩展重命名 + ID 变更导致 CORS allowlist 失效 | 发布前更新 `CAPTURE_CORS_ALLOWED_ORIGINS`，文档同步 |
| Schema 合并 migration 涉及多张表的数据更新 + fingerprint 回填，单步出错难回滚 | migration 拆两步：(1) `consolidate-article-extract-to-web-extract` (2) `consolidate-non-video-source-types-to-web-page`；每步独立可回滚；上线前在本地库跑预检 SQL 确认存量量级 |
| `sourceFingerprint` 重算后，未来再采同一 URL 的去重才会生效；过渡期可能短暂双写 | 低风险（个人项目存量数据少），文档标注；如果发现重复，手动合并即可 |
| `extractor` 字段是 zod enum，新增 extractor 必须同步更新 enum，引入小耦合 | 接受。这是为换"长期模型一致"付的合理税；`shared/extractor-registry.js` 与 `lib/capture/context.ts` 集中维护 |
| Defuddle 在扩展 bundle vs 服务端 npm 的版本漂移 | 本 PR 服务端不用 Defuddle，无漂移风险；未来引入服务端时加 CI 校验 dist 版本一致 |
| bilibili refactor 没有自动化 snapshot 对比工具，靠 fixture 测试 + 手动验收 | fixture 测试覆盖 5 个关键 scenario；手动验收清单在 tasks 15 |

## Migration Plan

### 发布步骤

1. **代码与基础设施**
   - 引入 vitest + jsdom（task 0）
   - 扩展目录重命名 + 注入放开（task 1）
   - 引入 esbuild + Defuddle bundle
   - 测试与回归先行（task 3）

2. **新 extractor 与 content.js 适配**（tasks 4-8）

3. **Schema 与 worker 改造**（tasks 9-12）
   - 在本地 DB 跑预检 SQL → 确认存量数据量
   - 跑 migration（拆两步执行）
   - worker dispatcher 泛化
   - token scope 迁移兼容

4. **扩展发布**
   - 打包 `chrome-capture` 扩展
   - 获取新扩展 ID，更新 `CAPTURE_CORS_ALLOWED_ORIGINS`
   - 旧扩展用户在控制台看提示"已废弃，请安装新版"

5. **用户侧迁移**（个人项目，目前只有开发者自己）
   - 卸载 `PineSnap Bilibili Capture`
   - 安装 `PineSnap Capture`
   - token 仍然有效（scope 别名兼容）

### 回滚策略

- **代码层**：扩展产物保留旧版打包一份；服务端代码可按 commit revert
- **DB 层**：两步 migration 各自有 down 路径恢复枚举值；数据级回填不强制反向（如需 rollback 数据，从 backup 恢复）
- **token scope 兼容代码**：保留 sunset 期，期满清理时再 PR
