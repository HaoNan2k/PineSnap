# chat-ui (delta): refactor-chat-components-structure

## MODIFIED Requirements

### Requirement: Chat feature module structure
代码组织 SHOULD 将 chat feature 的关注点拆分为 `types/`、`hooks/`、`utils/`，并避免在单一目录中混放类型、业务 hooks 与工具函数。

#### Scenario: Hook / types / utils 分层
- **WHEN** 开发者阅读或修改 chat feature 代码
- **THEN** 领域类型 MUST 位于 `components/chat/types/`
- **AND** React hooks MUST 位于 `components/chat/hooks/`
- **AND** 纯工具函数 MUST 位于 `components/chat/utils/`

### Requirement: Import style consistency
项目代码 SHOULD 优先使用 `@/` 路径别名导入同仓库模块，避免深层相对路径导致的可读性下降。

#### Scenario: 使用 `@/` 路径别名
- **WHEN** 代码从 `app/` 或 `components/` 导入同仓库文件
- **THEN** 导入语句 SHOULD 使用 `@/` 别名（例如 `@/components/chat`）
- **AND** 深层相对路径（例如 `../../..`）SHOULD 被替换为别名导入


