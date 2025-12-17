# Delta Spec: adopt-gemini-ui-and-file-upload (chat-storage)

## ADDED Requirements

### Requirement: File Upload API
系统 SHALL 提供文件上传接口，用于将用户文件持久化并返回可引用的标识符。

#### Scenario: 上传文件
- **WHEN** 客户端 POST 文件到 `/api/files/upload`
- **THEN** 服务端 MUST 将文件保存到存储层
- **AND** 返回 `{ ref, url, name, contentType }` 结构
- **AND** `ref` MUST 是能够被后端 `converter` 解析的内部键

