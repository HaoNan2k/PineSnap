# content-capture / spec delta（连接 Bilibili）

## ADDED Requirements

### Requirement: 系统提供“连接 Bilibili”的一键启用入口

系统 SHALL 提供一个面向普通用户的“连接 Bilibili”入口，使用户无需理解 Userscript/token 概念即可启用 B 站采集能力。

#### Scenario: 用户在 PineSnap 中连接 Bilibili

- Given 用户已登录 PineSnap
- When 用户进入“连接 Bilibili”页面并点击“一键启用”
- Then 系统 MUST 为该用户生成或轮换跨站采集所需的授权凭证
- And 系统 MUST 引导用户完成浏览器侧安装步骤

### Requirement: 系统支持断开连接并立即生效

系统 SHALL 支持用户断开 Bilibili 连接，并使该连接对应的采集请求立即失效。

#### Scenario: 用户断开连接后，采集请求被拒绝

- Given 用户已连接 Bilibili
- When 用户在 PineSnap 中执行“断开连接”
- Then 后续从 B 站页面发起的采集请求 MUST 返回鉴权失败（例如 401）

