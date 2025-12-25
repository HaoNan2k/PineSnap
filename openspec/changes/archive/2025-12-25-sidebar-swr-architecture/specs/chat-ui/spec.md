# Delta Spec: chat-ui (sidebar-swr-architecture)

## ADDED Requirements

### Requirement: Sidebar history uses SWR for conversations
侧边栏会话列表 SHALL 使用 SWR 从 `/api/conversations` 获取数据，并按最近活动排序，以避免依赖 RSC 刷新导致的流式中断。

#### Scenario: 加载与排序
- **WHEN** 侧边栏渲染会话历史
- **THEN** UI MUST 使用 `useSWR('/api/conversations')` 获取会话列表
- **AND** 列表 MUST 按 `updatedAt` 降序排序
- **AND** 加载态 MUST 显示骨架屏

### Requirement: Sidebar groups conversations by recency
侧边栏会话列表 SHALL 按时间对会话分组展示，以提升可扫描性。

#### Scenario: 分组展示
- **WHEN** 侧边栏渲染会话历史
- **THEN** 会话列表 MUST 按时间分组（例如 Today / This Week / Earlier）
- **AND** 每个分组 MUST 显示分组标题
- **AND** 空分组 SHOULD NOT 显示

### Requirement: Sidebar updates in near real-time via mutate
侧边栏会话列表 SHALL 支持通过 `mutate('/api/conversations')` 触发的近实时刷新，以反映新建、标题更新与删除。

#### Scenario: 新建会话后刷新
- **WHEN** 用户在 `/chat` 发送第一条消息并完成会话创建
- **THEN** 侧边栏 MUST 在合理时间内显示新会话条目

#### Scenario: 标题更新后刷新
- **WHEN** 服务端更新会话标题并通过流式事件通知客户端
- **THEN** 侧边栏 MUST 在合理时间内显示新标题

#### Scenario: 删除会话后刷新
- **WHEN** 用户删除某个会话
- **THEN** 侧边栏 MUST 立即移除该会话条目

### Requirement: Sidebar supports optimistic rename/delete
侧边栏对重命名与删除操作 SHALL 支持乐观更新，并在请求失败时 MUST 回滚到一致状态（并提示错误）。

#### Scenario: 删除操作乐观更新与回滚
- **WHEN** 用户触发删除并确认
- **THEN** UI SHOULD 先从列表中移除该会话再发送请求
- **AND** 若请求失败，UI SHOULD 回滚并提示错误

#### Scenario: 重命名操作乐观更新与回滚
- **WHEN** 用户提交会话重命名
- **THEN** UI SHOULD 先更新列表标题再发送请求
- **AND** 若请求失败，UI SHOULD 回滚并提示错误

