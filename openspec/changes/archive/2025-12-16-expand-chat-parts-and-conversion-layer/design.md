# Design: ChatPart 扩展与转换层架构

## 1. ChatPart 最终形态 (DB/Domain Truth)

```ts
export type ChatPart = 
  | { type: 'text'; text: string }
  | { 
      type: 'file'; 
      name: string; 
      mimeType: string; 
      ref: string; // 内部引用 key，需转换层处理
    }
  | {
      type: 'tool-call';
      toolCallId: string;
      toolName: string;
      input: unknown; // 全量落库
    }
  | {
      type: 'tool-result';
      toolCallId: string;
      toolName: string;
      output: unknown; // 全量落库
      isError?: boolean;
    };
```

## 2. 转换层 (Converter)

位于 `lib/chat/converter.ts`，提供纯函数（或带依赖注入的 async 函数）：

### 2.1 DB -> Model (Context Construction)
`async function convertToModelMessages(dbMessages: Message[]): Promise<ModelMessage[]>`
- **Text**: 直接透传。
- **File**: 将 `ref` 转换为模型可用的 `image: URL` 或 `file: DataContent`（本期先做 URL 占位，预留 `resolveFileRef` 接口）。
- **Tool**: 将 `tool-call` / `tool-result` 转换为 AI SDK 标准的 `ToolCallPart` / `ToolResultPart`。

### 2.2 Model/UI -> DB (Persistence)
`function convertToChatParts(content: UserContent | AssistantContent | StepResult): ChatPart[]`
- 负责把 SDK 的 `ContentPart[]` 映射回我们的 `ChatPart` union。
- 对于 File，假设已上传并拿到 `ref`（Upload 流程在 scope 外，这里主要处理结构映射）。

### 2.3 DB -> UI (Rendering)
`function convertToUIMessages(dbMessages: Message[]): UIMessage[]`
- **Text**: 透传。
- **File**: 映射为 `FileUIPart` (url 可能为临时链接或占位)。
- **Tool**: 映射为 `ToolUIPart` (支持 UI 渲染工具状态)。

## 3. 存储策略
- **PG**: 只存 `ChatPart` (jsonb)。
- **File**: 外部存储 (S3/FS)，DB 仅存 `ref`。

