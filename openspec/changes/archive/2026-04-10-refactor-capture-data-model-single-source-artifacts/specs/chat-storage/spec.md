# chat-storage / spec delta

## MODIFIED Requirements

### Requirement: Persist structured message parts in PostgreSQL

系统 SHALL 将消息内容以结构化 `parts` 形式持久化到 PostgreSQL，并使用 `jsonb` 支持 schema 演进。

系统 MUST NOT 再维护独立的 `Message.content` 冗余文本列，消息内容真相源 MUST 为 `parts`。

#### Scenario: Message persistence writes parts only

- **WHEN** 系统保存一条用户或助手消息
- **THEN** 消息 MUST 写入 `parts` 字段（`ChatPart[]` 的 JSON 表示）
- **AND** 系统 MUST NOT 写入独立 `content` 文本列

### Requirement: Store final assistant output first

系统 SHALL 初期仅落库 assistant 的最终结果，不要求边流边存。

#### Scenario: Save final assistant message on completion

- **WHEN** assistant 结束生成
- **THEN** 系统 MUST 创建一条 role 为 `ASSISTANT` 的 `Message`
- **AND** 该消息的 `parts` MUST 反映最终输出内容
- **AND** 客户端展示文本预览 SHOULD 由 `parts` 推导，而非依赖冗余列
