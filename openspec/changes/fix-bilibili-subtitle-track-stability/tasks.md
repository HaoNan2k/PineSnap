# 任务：修复 Bilibili 字幕错轨稳定性

## 1. 文档沉淀

- [x] 新增 Bug 发现文档：`docs/bilibili-subtitle-track-mismatch-bug-report.md`
- [x] 在扩展开发文档中补充“轨道稳定性防护”说明与调试方法

## 2. OpenSpec 变更

- [x] 补充 `content-capture` delta spec（新增稳定性防护 requirement）
- [x] `openspec validate fix-bilibili-subtitle-track-stability --strict` 通过

## 3. 扩展实现

- [x] 在 `extensions/chrome-bilibili-capture/shared/extractors/bilibili-full-subtitle.js` 中新增轨道采样与一致性判定 helper
- [x] 保持主流程结构不变，仅替换“player_api 轨道解析”子流程
- [x] 新增失败码 `SUBTITLE_TRACK_UNSTABLE`
- [x] 将采样过程写入 `captureDiagnostics.trackResolution`

## 4. 用户提示与可观测性

- [x] 在 `extensions/chrome-bilibili-capture/content.js` 增加 `SUBTITLE_TRACK_UNSTABLE` 提示文案
- [x] 校验成功与失败场景都保留必要 diagnostics 字段

## 5. 验证

- [ ] 手工回归：同一视频连续采集多次，确认错轨率明显下降
- [ ] 手工回归：字幕 URL 为空时可重试并给出稳定失败提示
- [x] `pnpm lint` 通过（至少覆盖本次修改文件）

