# 提案：P0 将 B 站连接改为 Chrome 扩展优先（舍弃油猴主路径）

## 背景

当前连接流程仍以 Tampermonkey + userscript 为主，导致用户需要理解脚本安装、Token 粘贴等技术细节。该流程与“用户一键采集入库”的产品目标不一致，也不利于扩展作为主入口推广。

## 本次目标（仅 P0）

1. 将 `/connect/bilibili` 改为 Chrome 扩展优先的连接向导，主流程不再出现油猴安装步骤。
2. 建立扩展零手动鉴权闭环：用户登录 PineSnap 后，通过网页授权完成扩展连接，不需要复制/粘贴 Capture Token。
3. 保持现有采集入库契约不变：`POST /api/capture/bilibili`、`VideoCapturePayloadV1`、`{ ok: true, resourceId }`。
4. 提供受控兼容回滚：旧 userscript 路径默认下线，可通过配置开关临时恢复。

## 非目标（本次不做）

- 不实现微信扫码登录；继续复用现有 PineSnap 登录体系。
- 不扩展到 Firefox/Safari；第一期仅 Chrome/Chromium。
- 不改动 extractor 主体算法与 payload 结构字段。
- 不处理商店上架资产（隐私页、商店素材）等 P2 工作。

## 决策清单

### 沿用既有决策

- 采集鉴权继续使用服务端控制的 `CaptureToken` + scope（`capture:bilibili`）。
- 采集端点继续由服务端校验并原样写入 `Resource.content`。
- 采集与对话解耦，不在采集阶段创建 `Conversation/Message`。

### 本次新增/变更决策

- 连接主路径从油猴切换为“扩展授权连接”。
- 用户体验以“安装扩展 -> 点击连接 -> 网页确认授权 -> 一键采集”为唯一推荐路径。
- Token 仍存在于系统内部，但不再作为用户可见配置项出现在主路径。
- legacy userscript 仅作为短期应急回滚能力。

## 预期收益

- 显著缩短首次可用路径，降低新用户流失。
- 减少人工配置错误（错误 Token、错误 Base URL、过期 Token）。
- 保持后端契约稳定，降低对现有学习链路的影响。
