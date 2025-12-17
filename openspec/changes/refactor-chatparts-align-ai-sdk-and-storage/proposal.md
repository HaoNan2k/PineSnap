# Proposal: Refactor ChatPart schema to align AI SDK + add storage resolver abstraction

## Why

当前聊天在发送 **文件/图片** 时会出现两类阻断性错误：

- **Prompt schema 校验失败**：服务端构造的 `ModelMessage[]` 与 AI SDK 6 beta 的 `provider-utils` schema 不一致（例如 `FilePart.mediaType` 字段名不匹配、tool part 的 `input/output` 字段名不匹配）。
- **AI Gateway / Provider 无法拉取本地 URL**：图片以 `URL` 形式传入（例如 `http://dummy/uploads/...` 或 `localhost`），在云端网关/模型侧不可访问，导致 `Invalid or unsupported file uri`。

这些问题表明：项目内部 `ChatPart` 与 AI SDK 的 prompt 结构存在“概念混用”（把“持久化引用”与“可喂给模型的内容”混在同一层），且缺少一个可替换的“文件内容解析/获取”抽象。

## Scope

- **ChatPart（request/persist/replay）对齐**：
  - `file` part 使用 `mediaType`（而非 `mimeType`），保留 `ref/name/size` 等元信息；不在 DB 存文件二进制。
  - `tool-call/tool-result` 使用 `input/output`（而非 `args/result`）。
  - 定义向后兼容策略：在迁移窗口内，服务端解析器 SHOULD 能读取旧字段名并规范化。
- **Prompt Hydration（DB → ModelMessage）改造**：
  - 图片附件默认以 **bytes** 形式喂给模型（避免云端拉取本地 URL）。
  - 非图片附件默认不作为 `FilePart` 进入 prompt；文本类附件通过“抽取文本”进入 prompt（text part）。
- **Storage Resolver 抽象**：
  - 引入可替换的 `FileContentResolver`（或等价命名）接口，提供 `readBytes(ref)` 与 `resolvePublicUrl(ref)` 等能力。
  - 本地实现：从 `public/uploads` 读取 bytes；未来上云实现：可返回公网/签名 URL 或 bytes（由实现选择）。

## Non-goals

- 本变更不包含 UI 错误提示的视觉/交互设计（但会在任务中保留技术挂点，如 error data part / hooks）。
- 不引入完整的文件解析管线（OCR、PDF 解析、向量化等）；仅定义最小可演进接口与“文本抽取”策略占位。

## Success criteria

- 发送 `.md` 等文本文件：服务端不再触发 `Invalid prompt`，模型可获得附件文本内容（可截断）。
- 发送图片：不再出现 `Invalid or unsupported file uri`；图片以 bytes 形式进入 prompt。
- ChatPart schema 与 AI SDK 6 beta 的关键字段命名一致（`mediaType`, `input`, `output`），并在 OpenSpec 中有可执行的 requirements/scenarios 覆盖。

