# Tasks: 实现 ChatPart 扩展与转换层

- [x] 1. **Core Types 升级** (`lib/chat/types.ts`)
  - 定义完整的 `ChatPart` union (Text, File, ToolCall, ToolResult).
  - 更新 `parseMessageParts` 以支持新类型（且保持 unknown 兼容）.

- [x] 2. **Converter 实现** (`lib/chat/converter.ts`)
  - 实现 `dbToModelMessages`：处理 Tool 结构转换，预留 File Ref 解析位.
  - 实现 `sdkToChatParts`：把 AI SDK 的 content parts 转回 DB 结构.
  - 迁移并增强 `convertToUIMessages`：支持 Tool 展示结构.

- [x] 3. **API 适配** (`app/api/chat/route.ts`)
  - 使用 `converter.dbToModelMessages` 替代原来的 `dbPartsTo*Content`.
  - 在 `onFinish` 落库时，使用 `converter.sdkToChatParts` 处理完整输出（不仅是 text）.

- [x] 4. **验证**
  - 单测/脚本验证：Tool Call/Result 转换无损.
  - 链路验证：发送包含 Tool 的消息（模拟），DB 落库正确，重放时上下文正确.

