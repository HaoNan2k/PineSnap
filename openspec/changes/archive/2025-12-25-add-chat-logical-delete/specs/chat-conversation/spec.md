## MODIFIED Requirements

### Requirement: DELETE conversation performs soft delete
系统 SHALL 保持 `DELETE /api/conversations/[id]` 路由形态不变，但其语义 MUST 为逻辑删除（软删除）。

#### Scenario: Delete endpoint hides the conversation
- **WHEN** 客户端对现有会话调用 `DELETE /api/conversations/[id]`
- **THEN** 系统 MUST 将该会话标记为已删除（软删除）
- **AND** 该会话 MUST 不再出现在会话列表中
- **AND** 再次获取该会话详情 MUST 返回 404（与“不存在”一致）

