# Delta Spec: add-supabase-storage-signed-url (chat-storage)

## MODIFIED Requirements

### Requirement: ChatPart supports full semantic union
系统 MUST 持久化 `ChatPart.file.ref` 作为内部稳定引用（object key），并确保该引用在云端环境可长期解析为 bytes 或短期可访问 URL。

#### Scenario: Persist File Ref as stable object key
- **WHEN** 用户发送文件
- **THEN** 系统 MUST 在 `parts` 中存储 `ref`（稳定引用）与 `name`/`mediaType`（以及可选 `size`）
- **AND** `ref` MUST 表示 Supabase Storage 的 object key（而不是本地文件路径）
- **AND** 系统 MUST NOT 在 DB 中存储文件二进制内容

## ADDED Requirements

### Requirement: Private storage with short-lived signed URL for UI preview
系统 SHALL 默认将文件存储为私有，并通过短期签名 URL 为 UI 提供预览/下载能力。

#### Scenario: Signed URL is generated on demand and is short-lived
- **GIVEN** 一条消息的 `parts` 包含 `file.ref`
- **WHEN** UI 需要渲染该文件的预览/下载链接
- **THEN** 服务端 MUST 基于 `ref` 生成 signed URL
- **AND** signed URL MUST 为短期有效（TTL 短）

#### Scenario: Signed URL MUST NOT be stored in DB
- **WHEN** 系统保存消息到 DB
- **THEN** DB MUST 仅存储 `ref`（object key）
- **AND** 系统 MUST NOT 将 signed URL 持久化到 DB

### Requirement: Upload MUST enforce size limit and media type allowlist
系统 MUST 在服务端对上传文件执行大小限制与类型白名单校验，以降低滥用与安全风险。

#### Scenario: Reject oversized files
- **WHEN** 用户上传文件且文件大小超过上限
- **THEN** 服务端 MUST 返回 400 并拒绝保存

#### Scenario: Reject disallowed media types
- **WHEN** 用户上传文件且文件类型不在允许列表中
- **THEN** 服务端 MUST 返回 400 并拒绝保存


