# Tasks: Refactor ChatPart schema + storage resolver abstraction

- [x] 1. **规格对齐与兼容策略**
  - [x] 1.1 明确 `ChatPart` 新 schema（`mediaType`, `input`, `output`）并在转换层支持旧字段（`mimeType`, `args`, `result`）的读取与规范化（迁移窗口）。
  - [x] 1.2 决定 `source` part 策略：本期 **持久化**（落库为 `ChatPart.source`，用于回放/审计）。

- [x] 2. **Storage Resolver 抽象（bytes now）**
  - [x] 2.1 引入 `FileContentResolver` 接口：`readBytes(ref)` + `resolvePublicUrl(ref)`。
  - [x] 2.2 实现 Local resolver：从 `public/uploads` 读取 bytes；URL 仅供 UI 回放。

- [x] 3. **服务端 Prompt Hydration 改造**
  - [x] 3.1 DB→ModelMessage 转换：图片 `file` → `ImagePart`(bytes)，禁止生成 `http://dummy/...` URL。
  - [x] 3.2 文本类附件：抽取文本（带大小上限/截断）并注入 prompt 的 `TextPart`。
  - [x] 3.3 非文本非图片附件：默认不进入 prompt，但保持在 `Message.parts` 中可回放。

- [x] 4. **SDK 输出 → DB（sdkToChatParts）健壮性**
  - [x] 4.1 更新 `sdkToChatParts` 入参类型以匹配 AI SDK 6 beta（允许 `ContentPart[]`），并显式处理 `source` 与 tool-* 等新 part 类型（reasoning/file 暂忽略）。
  - [x] 4.2 工具相关字段统一为 `input/output`。

- [x] 5. **客户端发送与回放（最小改动）**
  - [x] 5.1 Transport/Composer 发送 `file` part 时使用 `mediaType` 字段（不再使用 `mimeType`）。
  - [x] 5.2 回放渲染：从 `ref` 解析 URL（展示文件卡片即可）。

- [x] 6. **验证路径（手工可复现）**
  - [x] 6.1 发送 `.md`：当浏览器提供 `text/markdown` 等文本类型时，服务端注入抽取文本且无 `Invalid prompt`。
  - [x] 6.2 发送图片：无 `Invalid or unsupported file uri`，模型可识别图片内容（bytes-first 生效）。
  - [x] 6.3 混合发送：文本 + 图片 + 文件卡片回放正常；刷新页面历史一致。

