# chat-storage (delta): Align ChatPart schema with AI SDK and add file content resolver

## MODIFIED Requirements

### Requirement: ChatPart supports full semantic union (aligned with AI SDK naming)
系统 SHALL 支持完整的对话语义存储（文本、文件引用、工具调用与结果），并且 `ChatPart` 的关键字段命名 MUST 与 AI SDK 6 beta 的 prompt parts 对齐：

- `file` part MUST 使用 `mediaType`（不使用 `mimeType`）。
- `tool-call` part MUST 使用 `input`（不使用 `args`）。
- `tool-result` part MUST 使用 `output`（不使用 `result`）。

#### Scenario: 存储 Tool Call 和 Result（input/output）
- **WHEN** 模型发起工具调用或产生工具结果
- **THEN** 系统 MUST 存储 `toolCallId`, `toolName`, `input`/`output`
- **AND** 系统 MUST NOT 使用旧字段名 `args`/`result` 作为最终落库格式
- **AND**（兼容期）系统 SHOULD 能读取旧字段并规范化为新字段后再持久化/回放

#### Scenario: 存储 File Ref（mediaType）
- **WHEN** 用户发送文件
- **THEN** 系统 MUST 存储文件的 `ref`, `name`, `mediaType`（以及可选 `size`）
- **AND** 系统 MUST NOT 在 DB 中存储文件二进制内容

### Requirement: File content resolution is abstracted for local bytes and future cloud URLs
系统 SHALL 提供一个可替换的“文件内容解析/获取”抽象，以支持：

- 本地开发：通过 `readBytes(ref)` 获取 bytes（用于图片 prompt）
- 未来上云：通过 `resolvePublicUrl(ref)` 获取 https public/signed URL（用于 UI/或 provider 支持时作为替代输入）

#### Scenario: Local bytes-first image prompt hydration
- **GIVEN** 一条消息的 `parts` 包含 `file`，且 `mediaType` 为 `image/*`
- **WHEN** 服务端构造 `ModelMessage[]` 调用模型
- **THEN** 服务端 MUST 使用 resolver 的 `readBytes(ref)` 构造 `ImagePart.image = bytes`
- **AND** 服务端 MUST NOT 使用 `http://dummy/...` 或 `localhost` URL 作为模型输入

#### Scenario: Text-like file is injected as bounded text
- **GIVEN** 一条消息的 `parts` 包含 `file`，且 `mediaType` 为 `text/*` 或 `text/markdown` 等文本类型
- **WHEN** 服务端构造 `ModelMessage[]`
- **THEN** 服务端 SHOULD 将文件内容抽取为文本并以 `TextPart` 形式注入 prompt
- **AND** 服务端 SHOULD 对注入文本设置大小上限并在截断时写入提示

