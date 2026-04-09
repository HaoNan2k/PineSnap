# content-capture / spec delta

## ADDED Requirements

### Requirement: Bilibili subtitle track resolution MUST guard against unstable upstream responses

当扩展通过 `x/player/v2` 解析字幕轨时，系统 MUST 进行轨道稳定性判定，而非盲信单次返回，以降低错轨入库风险。

#### Scenario: Stable track is resolved through bounded sampling

- Given 用户在同一 B 站视频页面触发采集
- And 扩展通过 `player_api` 路径获取字幕轨
- When 单次 `x/player/v2` 返回结果存在短时波动
- Then 系统 MUST 在上限次数内执行轨道采样与一致性判定
- And 当形成稳定轨道结论时 MUST 使用该轨道继续拉取字幕正文

#### Scenario: No stable track consensus returns explicit failure

- Given 扩展在上限采样次数内无法形成稳定轨道结论
- When 扩展结束本轮字幕轨判定
- Then 系统 MUST 返回明确失败语义（例如 `SUBTITLE_TRACK_UNSTABLE`）
- And 系统 MUST NOT 上传可能错误的字幕正文到服务端

### Requirement: Bilibili capture diagnostics MUST include track resolution evidence

当扩展执行轨道稳定性防护时，`metadata.captureDiagnostics` MUST 记录采样过程与判定结果，便于排障和回归验证。

#### Scenario: Diagnostics stores sampling summary

- Given 扩展在 `player_api` 路径执行了多次轨道采样
- When 扩展产出最终采集 payload
- Then `captureDiagnostics` MUST 包含轨道采样摘要（如样本列表、尝试次数、判定来源）

