# 任务清单：多来源三层采集模型重构

## 0. OpenSpec 准备

- [x] 与产品确认来源范围：Bilibili / 公众号 / 网页 / YouTube / 小红书
- [x] 运行 `openspec validate add-bilibili-server-side-asr-fallback --strict`

## 1. 数据库与模型

- [x] 扩展 `Resource`：新增 `sourceType`、`sourceUrl`、`canonicalUrl`、`sourceFingerprint`
- [x] 新增 `CaptureJob` 表（含 `resourceId` 非空约束、状态、幂等键、inputContext）
- [x] 扩展 `CaptureJob`：新增 `jobType`、`executionMode` 字段与枚举约束
- [x] 新增 `CaptureArtifact` 表（含 `resourceId`、`jobId`、`kind`、`language`、`isPrimary`）
- [x] 增加唯一约束：`CaptureJob(userId, sourceType, captureRequestId)`
- [x] 增加主版本约束：同 `(resourceId, kind, language)` 仅一个 `isPrimary=true`

## 2. 服务端 API

- [x] 新增统一任务入口 `POST /api/capture/jobs`
- [x] 新增任务状态查询 `GET /api/capture/jobs/:jobId`
- [x] 新增资源任务历史查询 `GET /api/capture/resources/:resourceId/jobs`
- [x] 保证鉴权与来源隔离（按 userId）

## 3. 任务执行与状态规则

- [x] 实现 worker 消费：`PENDING -> RUNNING -> terminal`
- [x] 实现 `activeJob` 选择规则（superseded 过滤 + 最新优先）
- [x] 实现失败可重试策略（可重试/不可重试分类）
- [x] 实现 Artifact primary 切换事务逻辑

## 4. CaptureContext 契约

- [x] 定义 `CaptureContext` schema（通用字段 + `providerContext`）
- [x] 定义 `jobType` 枚举与来源映射规则（bilibili/wechat/web/youtube/xiaohongshu）
- [x] 定义 `canonicalUrl` 规范化规则
- [x] 定义 `sourceFingerprint` 生成规则
- [x] 支持来源专用扩展字段：
  - [x] bilibili
  - [x] wechat_article
  - [x] web_page
  - [x] youtube
  - [x] xiaohongshu

## 5. 客户端与列表展示

- [x] 客户端改为统一 jobs 入口触发
- [x] 列表状态读取 `activeJob.status`
- [x] 列表内容读取 `primary artifact`
- [x] 失败态展示“已收藏，处理中失败，可重试”

## 6. 文档与评审

- [x] 在 `docs/` 新增 `CaptureContext` 字段与用途文档
- [x] 在 `docs/` 新增“三层模型关系与状态规则”文档
- [x] 完成代码 review（状态真相源、幂等、唯一约束、来源扩展）
- [ ] 完成回归：五类来源至少各一条成功路径 + 一条失败路径
