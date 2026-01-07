# content-capture / spec delta（capture → Resource）

## MODIFIED Requirements

### Requirement: B 站采集结果以 Resource 形式入库

系统 SHALL 将 B 站采集结果以结构化 `Resource` 形式存储到数据库，而不是直接创建对话消息。

#### Scenario: Userscript 发送采集结果到服务端后，服务端创建 Resource

- Given Userscript 向 `POST /api/capture/bilibili` 发送 v1 payload
- And 请求携带具备 `capture:bilibili` scope 的 `Bearer` token
- When 服务端接收到请求并完成校验
- Then 服务端 MUST 创建一条 `Resource` 记录
- And `Resource.content` MUST 存储完整 payload（结构化 JSON）
- And 服务端 MUST 返回 `{ ok: true, resourceId: string }`

## REMOVED Requirements

### Requirement: 采集成功后自动打开对话页面

#### Scenario: 采集成功后自动跳转到 `/chat/c/[id]`

- Given Userscript 已成功向服务端发送采集结果
- When 服务端返回成功响应
- Then Userscript MUST 自动打开 PineSnap 中的新对话页面

