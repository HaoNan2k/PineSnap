# assisted-learning-loop（Delta Spec）

## MODIFIED Requirements

### Requirement: Learn Focus MUST implement minimal header
系统 SHALL 在 Learn Focus 页面提供基础结构：顶部极简 Header。

#### Scenario: Focus uses resourceId route
- **WHEN** 用户访问 `/learn/[resourceId]`
- **THEN** 页面 MUST 使用 Focus Layout
- **AND** Focus Layout MUST NOT 渲染 Sidebar

### Requirement: Learn flow MUST start with clarification before interaction
系统 SHALL 在用户访问 Learn Focus 页面后自动进入澄清阶段，再生成 Plan，最后进入互动阶段。

#### Scenario: Page load triggers clarification first
- **WHEN** 用户访问 `/learn/[resourceId]`
- **THEN** 系统 MUST 进入澄清阶段并生成澄清问题
- **AND** 系统 MUST 在澄清完成后生成 Plan
