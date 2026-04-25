# 0005 — 多源采集的 sourceType 与 jobType 建模收敛

- 日期：2026-04-25
- 状态：accepted
- 关联：`generalize-capture-extension` change（archive: `2026-04-25-generalize-capture-extension`）
- 相关 PR：#12 / #13 / #15

## 背景

PineSnap 的扩展从早期"只采 B 站字幕"演进到"博客 + 公众号 + 知乎 + B 站 + YouTube 多源"过程中，schema 累积了几个语义重叠 / 维护成本高的字段：

**`CaptureSourceType` 枚举**：

```
bilibili, wechat_article, web_page, youtube, xiaohongshu, douyin
```

`wechat_article` 与 `xiaohongshu` 是早期升格为 sourceType 的特殊来源。后续每加一个站点都倾向于"也升格成独立 sourceType"，结果变成：

- 每加一个新站点要跑一次 prisma migration
- 下游路由代码每条分支多一个 case
- `requiredCaptureScope("wechat_article") = "capture:wechat_article"` 也跟着膨胀
- 但运行时其实没有任何代码依赖 sourceType 区分公众号 vs 通用网页 —— 都是文章型抽取，都进同一个流程

**`CaptureJobType` 枚举**：

```
subtitle_fetch, audio_transcribe, web_extract, article_extract,
summary_generate, media_ingest
```

`web_extract` 和 `article_extract` 完全语义重叠，没有任何 worker handler 区分它们：

- `wechat_article` sourceType → `article_extract` jobType
- 其他非视频 sourceType → `web_extract` jobType
- 两者最终走同一个抽取链路（甚至 worker 不消费它们 —— 因为扩展端预抽完直接同步落库）

## 候选方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **A. 全合并到 `web_page` + `providerContext.webPage.extractor` 字段区分站点** ✅ | 加新站点 0 migration；模型一致；运行时区分仍可做（按 extractor）；与扩展端 SITE_ADAPTERS 数组天然对称 | 一次性 migration 工作量（含数据回迁 + fingerprint 重算），但项目早期，存量数据少 |
| B. 保留 `wechat_article` 作历史特例，新站点用 `web_page + extractor` | 不动存量数据 | 模型不极致一致，未来"为什么这条特殊"会反复被问 |
| C. 给每个新站点都升格为 sourceType | sourceType 自带语义 | 每加一个站点一次 migration；长期不可持续 |

类似地，jobType 上：

| 方案 | 决策 |
|------|------|
| **合并 `article_extract` → `web_extract`** ✅ | 删除完全语义重叠的枚举值 |
| 保留两个 + 文档区分语义 | 长期会被误用，命名税 |

## 决策

**采用方案 A 全合并 + jobType 合并**。Phase C migration `20260425143247_consolidate_source_and_job_types` 删除三个枚举值：

- `CaptureSourceType`：删 `wechat_article` / `xiaohongshu`
- `CaptureJobType`：删 `article_extract`

`providerContext.webPage` 新增 zod enum 字段 `extractor`：

```ts
export const webPageExtractorSchema = z.enum([
  "generic_article_v1",
  "wechat_article_v1",
  "zhihu_answer_v1",
]);
```

取值与扩展端 `SITE_ADAPTERS` 注册的 provider id 同源。下游需要按站点区分时（如卡片展示"公众号"徽标）读这个字段，不读 sourceType。

## 安全网

PG <17 不支持 `ALTER TYPE DROP VALUE`，migration 用 rename → CREATE 新 → ALTER COLUMN ... USING ::text:: → DROP 旧 模式。**USING cast 充当安全网**：如果生产数据真有遗漏（用了删除的枚举值），cast 会抛错让整个 migration 回滚，不会留下半截脏数据。

Staging 预检结果：0 行阻塞，migration 应用顺畅。

## 后续应该怎么做

**遇到下一个新站点采集需求时**：

1. **默认**：在扩展端 `shared/extractors/` 加新 extractor，`provider id` 命名 `<site>_<kind>_v1`
2. 把 provider id 加到 `webPageExtractorSchema` zod enum + `ALLOWED_WEB_PAGE_EXTRACTORS` 集合
3. **不要**升格为新 sourceType
4. 下游需要按站点区分时读 `providerContext.webPage.extractor`

**什么情况才升格为独立 sourceType（极少）**：

- 该来源**根本不是"网页文章 / 视频字幕"形态** —— 比如未来要做播客 RSS 订阅、邮件附件、API webhook 这类入口完全不同的源
- 简单说：**当 artifact.kind 形态不能被现有 `extracted_text` / `official_subtitle` / `asr_transcript` 表达**时，才考虑升格

## 教训

- 早期为了"语义清楚"把每个站点升格为独立 sourceType / jobType，看起来朴素，但本质是把"扩展端 extractor 路由"这件事错放到了"领域模型 enum"层。**枚举不是文档，是契约**，每加一个值都意味着每一处消费者都要更新。
- 用 providerContext 字段（JSON-friendly + zod enum）承担站点区分，加新站点零 migration，是更合适的边界。
