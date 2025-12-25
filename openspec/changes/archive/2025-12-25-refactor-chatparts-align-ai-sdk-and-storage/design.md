# Design: ChatPart 对齐 AI SDK 6 beta + Storage Resolver 抽象（bytes now, cloud later）

## Context

当前实现把“持久化引用（ref/url）”直接塞进 prompt parts，导致：

- **Prompt schema 不一致**：`file` part 字段名等与 AI SDK 6 beta 不一致（例如 `mediaType` vs `mimeType`，tool `input/output` vs `args/result`）。
- **Provider 无法访问本地 URL**：图片以 `URL` 形式传入（`http://dummy/...`、`localhost`），AI Gateway / 模型侧无法抓取，出现 `Invalid or unsupported file uri`。
- **SDK 类型演进**：`streamText().onFinish({ content })` 的 `content` 可能包含 `source` 等新 part，现有转换函数类型过窄。

## Goals

- `ChatPart` 成为 **request/persist/replay** 的稳定内部契约（DB 真相源）。
- prompt parts（`ModelMessage[]`）成为 **model-call** 的短生命周期结构，由服务端“水合/展开”得到。
- 图片默认以 **bytes** 进入 prompt；保留上云后切换为 `https signed/public URL` 的抽象点。

## Data structures (with examples)

### A) ChatPart (stored in DB + used in API body)

#### `text`

```json
{ "type": "text", "text": "有什么内容？" }
```

#### `file` (reference only, no bytes)

```json
{
  "type": "file",
  "ref": "5454d59a-9aad-4bc3-a757-3ef52c72ebaf.png",
  "name": "demo.png",
  "mediaType": "image/png",
  "size": 234567
}
```

#### `tool-call` (aligned naming: `input`)

```json
{
  "type": "tool-call",
  "toolCallId": "call_123",
  "toolName": "search",
  "input": { "q": "AI SDK 6 beta" }
}
```

#### `tool-result` (aligned naming: `output`)

```json
{
  "type": "tool-result",
  "toolCallId": "call_123",
  "toolName": "search",
  "output": { "items": [] },
  "isError": false
}
```

### B) Model prompt parts (AI SDK)

#### Text-only prompt

```json
{
  "role": "user",
  "content": [{ "type": "text", "text": "总结附件要点" }]
}
```

#### Image prompt (bytes now)

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "这张图是什么？" },
    { "type": "image", "image": "<bytes>", "mediaType": "image/png" }
  ]
}
```

#### Text attachment prompt (extract-to-text)

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "总结附件要点" },
    {
      "type": "text",
      "text": "附件《磁盘迁移记录.md》(text/markdown)：\n```md\n...内容(可能截断)...\n```"
    }
  ]
}
```

## Storage abstraction

### Interface (concept)

服务端 prompt builder 只依赖这个抽象，不直接依赖“本地文件系统 / 云对象存储”细节。

```ts
interface FileContentResolver {
  readBytes(ref: string): Promise<Uint8Array | Buffer>;
  resolvePublicUrl(ref: string): Promise<string>;
}
```

### Implementations

- **Local**:
  - `readBytes` 从 `public/uploads/<ref>` 读取 bytes。
  - `resolvePublicUrl` 返回 `/uploads/<ref>`（用于 UI 渲染，不用于 provider 取图）。
- **Cloud (future)**:
  - `resolvePublicUrl` 返回 `https://...` 的 public/signed URL。
  - `readBytes` MAY 直接从对象存储下载 bytes，或抛出 “not supported” 并由 prompt builder fallback 到 URL（视 provider 能力）。

## Server-side prompt hydration rules

- 对 `ChatPart.file`：
  - **IF** `mediaType` startsWith `image/` → MUST use `readBytes(ref)` and build `ImagePart.image = bytes`.
  - **ELSE IF** `mediaType` is text-like → SHOULD read bytes, decode + truncate, and inject as `TextPart`.
  - **ELSE** → SHOULD omit from prompt (keep in DB for replay).
- 对工具 parts：
  - 统一字段命名为 `input/output`，并在转换层处理 AI SDK 可能出现的新 part 类型（如 `source`），采用 “忽略或持久化 source” 的策略（由 spec 决定）。

