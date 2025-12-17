# Delta Spec: expand-chat-parts-and-conversion-layer (chat-storage)

## MODIFIED Requirements

### Requirement: ChatPart supports full semantic union
系统 SHALL 支持完整的对话语义存储，包括文本、文件引用、工具调用与结果。

#### Scenario: 存储 Tool Call 和 Result
- **WHEN** 模型发起工具调用或产生工具结果
- **THEN** 系统 MUST 全量存储 `toolCallId`, `toolName`, `input`/`output`
- **AND** 存储格式 MUST 符合 `ChatPart` schema

#### Scenario: 存储 File Ref
- **WHEN** 用户发送文件
- **THEN** 系统 MUST 存储文件的 `ref` (内部引用)
- **AND** 系统 MUST NOT 在 DB 中存储文件二进制内容

