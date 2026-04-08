# content-capture / spec delta

## ADDED Requirements

### Requirement: Bilibili connection UX SHALL be extension-first in P0

系统在 P0 阶段 SHALL 将 B 站连接主路径定义为 Chrome 扩展连接，不再要求用户通过 userscript 完成首次连接。

#### Scenario: Connect page presents extension-first flow

- **WHEN** 用户访问 `/connect/bilibili`
- **THEN** 页面 MUST 展示“安装扩展 + 连接扩展”主流程
- **AND** 主流程 MUST NOT 要求用户手工复制/粘贴 Capture Token

### Requirement: Extension authorization SHALL support one-time code exchange

系统 SHALL 提供扩展授权握手流程：授权确认后签发一次性授权码，扩展再交换 scope 为 `capture:bilibili` 的 Capture Token。

#### Scenario: Authorized extension receives scoped capture token

- **GIVEN** 用户已登录 PineSnap 且在授权页确认授权扩展
- **WHEN** 扩展使用有效授权码与对应 verifier 发起 token 交换
- **THEN** 服务端 MUST 返回可用于 `POST /api/capture/bilibili` 的 token
- **AND** 该 token MUST 包含 `capture:bilibili` scope

#### Scenario: Expired or consumed authorization code is rejected

- **WHEN** 扩展使用过期或已消费的一次性授权码进行交换
- **THEN** 服务端 MUST 拒绝请求并返回明确失败语义

### Requirement: Legacy userscript flow MUST be disabled by default

系统在 P0 中 MUST 将旧 userscript 连接路径设置为默认隐藏，仅作为应急回滚能力保留。

#### Scenario: Legacy flow hidden unless explicitly enabled

- **GIVEN** 部署未启用 legacy 开关
- **WHEN** 用户访问连接页面
- **THEN** 用户 MUST 看不到 userscript 安装主入口

## MODIFIED Requirements

### Requirement: Capture requests MUST be authenticated by server-controlled tokens

系统 SHALL 使用服务端生成的 `CaptureToken` 进行跨站采集鉴权；Token 可由扩展授权握手自动签发，不要求用户手工管理。

#### Scenario: Extension token is accepted for bilibili capture

- **WHEN** 扩展携带由服务端握手签发且包含 `capture:bilibili` scope 的 `Bearer` token 请求 `POST /api/capture/bilibili`
- **THEN** 服务端 MUST 视为合法鉴权并继续执行 payload 校验与入库流程
