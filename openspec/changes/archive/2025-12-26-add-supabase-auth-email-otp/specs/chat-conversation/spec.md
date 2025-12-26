# Delta Spec: add-supabase-auth-email-otp (chat-conversation)

## MODIFIED Requirements

### Requirement: Chat routes and deep-linking
在接入鉴权后，系统 MUST 将会话访问控制前置到服务端：只有已登录用户才能访问会话相关数据；并在“无权限/未登录/不存在”之间区分错误语义。

#### Scenario: Unauthenticated access returns 401
- **WHEN** 未登录用户请求会话详情或会话列表
- **THEN** 系统 MUST 返回 401

#### Scenario: Unauthorized access returns 403
- **GIVEN** 会话 `id` 存在
- **AND** 当前已登录用户不是该会话的 owner（`Conversation.userId !== currentUserId`）
- **WHEN** 用户访问 `/chat/c/[id]` 或调用会话相关 API
- **THEN** 系统 MUST 返回 403

#### Scenario: Not found returns 404
- **WHEN** 用户访问不存在的会话 `id`
- **THEN** 系统 MUST 返回 404

## REMOVED Requirements

### Requirement: Debug DB export endpoint exists
本变更移除用于调试的 DB 导出接口，防止公开环境数据泄露。

#### Scenario: GET /api/debug/db is removed
- **WHEN** 任意客户端请求 `GET /api/debug/db`
- **THEN** 系统 MUST 返回 404（路由不存在）


