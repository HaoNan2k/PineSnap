# Design: Supabase Storage 私有文件 + 短签名 URL（Signed URL）

## 概览

本设计将文件存储从 `public/uploads` 迁移到 Supabase Storage，并把文件访问策略设为“默认私有 + 短签名 URL”。

## 关键决策

- **私有默认**：文件存储在 private bucket。
- **短签名 URL**：前端预览/下载通过短期有效的 signed URL（例如 60 秒～5 分钟；本变更将以“短”为优先）。
- **引用稳定**：DB 只存 `ref`（Supabase object key），MUST NOT 存 signed URL。
- **删除策略（A）**：删除会话/消息不级联删除底层文件；后续通过 GC 清理“无引用文件”。
- **校验前置**：上传时服务端校验大小上限与类型白名单。

## `ref` 语义（概念）

- `ChatPart.file.ref` = Supabase Storage object key（例如 `users/<userId>/<uuid>.<ext>`）。
- `ref` MUST 是稳定引用，可用于：
  - UI 预览：通过 `ref` 生成 signed URL（短期有效）
  - Prompt hydration：服务端通过 `ref` 拉取 bytes（图片 bytes-first、文本文件 extract-to-text）

## Signed URL 使用规则

- signed URL MUST 为短期有效（TTL 短）。
- signed URL MUST NOT 写入 DB（仅作为 API 响应/运行时计算结果）。
- 前端如需长期展示，MUST 在 URL 过期后重新请求刷新（由 UI 逻辑或重放 API 承担）。

## 服务端校验（最小集合）

- 文件大小：MUST 有上限（初始可沿用 5MB，后续可按计划调整）。
- 文件类型：MUST 使用“声明 mediaType + 魔数 sniffing”综合判断，并与白名单匹配。

## 未来扩展点（不在本变更实现）

- 病毒扫描 / 内容安全：通过文件元数据与状态机（pending/clean/flagged）控制“可被喂给模型/可被预览”。
- API 代理下载：统一审计、配额、风控与 range 支持。
- 文件 GC：基于引用关系与保留期清理孤儿对象。


