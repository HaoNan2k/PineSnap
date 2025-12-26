# Delta Spec: add-supabase-auth-email-otp (chat-storage)

## MODIFIED Requirements

### Requirement: Temporary userId placeholder is server-controlled
在接入真实鉴权后，系统 MUST 使用 Supabase Auth 的 `user.id` 作为 `Conversation.userId` 的唯一真相源，并基于该值进行会话/消息隔离过滤。

#### Scenario: Conversation.userId uses Supabase user.id
- **WHEN** 用户通过 Email OTP 完成登录
- **AND** 用户创建或访问会话
- **THEN** 系统 MUST 使用该用户的 Supabase `user.id` 写入/过滤 `Conversation.userId`
- **AND** 该 `userId` MUST 为长期稳定标识（跨多次登录保持一致）

#### Scenario: Client cannot set userId
- **WHEN** 客户端发起会话/消息相关请求
- **THEN** 服务端 MUST NOT 信任客户端提供的 `userId`
- **AND** 所有读写 MUST 基于服务端从 session 得到的 `userId` 执行隔离过滤

#### Scenario: Unauthenticated requests are rejected
- **WHEN** 未登录客户端请求任何会话/消息/文件上传相关 API
- **THEN** 系统 MUST 返回 401


