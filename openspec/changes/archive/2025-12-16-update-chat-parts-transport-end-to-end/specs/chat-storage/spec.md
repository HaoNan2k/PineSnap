# Delta Spec: update-chat-parts-transport-end-to-end（chat-storage）

## MODIFIED Requirements

### Requirement: ChatPart supports evolvable union types (text + file minimum)
系统 SHALL 支持 `ChatPart[]` 作为可演进的 union；本次变更至少新增 `file` part，并保持与现有 `text` part 向后兼容。

#### Scenario: 存储 text part（向后兼容）
- **WHEN** 系统保存一条仅包含 text parts 的消息
- **THEN** 消息 MUST 将 `parts` 以 `jsonb` 形式持久化
- **AND** 系统 MUST 能在回放时按原语义渲染文本内容

#### Scenario: 存储 file part（最小语义）
- **WHEN** 系统保存一条包含 file part 的消息
- **THEN** 消息 MUST 将该 file part 以 `jsonb` 形式持久化
- **AND** file part MUST 至少包含 `name`
- **AND** file part MAY 包含 `mimeType`、`size`、`ref` 等元信息字段
- **AND** 系统 MUST NOT 要求把大块二进制内容直接存入 `jsonb`

### Requirement: Unknown parts are safely ignored (forward-compatibility)
系统 SHALL 具备前向兼容能力：当读取到未知 `type` 的 part 时，必须安全降级而非崩溃。

#### Scenario: 回放未知 part type
- **WHEN** 系统从数据库读取到包含未知 `type` 的 `parts`
- **THEN** 系统 MUST 忽略或降级该 part
- **AND** MUST 继续回放与渲染其余已知 parts

## References

- Vercel AI SDK 6 Beta：`https://v6.ai-sdk.dev/docs/announcing-ai-sdk-6-beta`


