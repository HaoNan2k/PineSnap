# 任务清单：P0 扩展优先连接改造

- [x] 新增扩展授权握手规范与 delta spec（仅覆盖 P0，不含 P1/P2）。
- [x] 新增授权码模型与服务端握手接口（authorize/exchange），支持一次性 code 与短 TTL。
- [x] 改造扩展配置页：主路径改为“连接 PineSnap”，移除手填 token 主入口（保留高级调试位可选）。
- [x] 改造 `/connect/bilibili`：下线油猴主流程文案与按钮，替换为扩展安装/连接向导。
- [x] 增加 legacy userscript 开关与回滚说明，默认隐藏旧入口。
- [ ] 完成 P0 验收（细化）：
  - [ ] 首次连接（扩展授权 -> exchange -> 采集成功）闭环验证。
  - [x] 未登录跳转登录后继续：`returnUrl` 采用 URL 编码，避免授权参数污染。
  - [x] code 过期：exchange 返回明确失败语义（`invalid_grant` + 描述），扩展端提示可重试连接。
  - [x] state 不匹配：扩展端在回跳后执行 state 校验并拒绝继续 exchange。
  - [x] 连接状态/撤销一致性：服务端固定扩展 label，连接页兼容历史 `ChromeExtension:*` 存量 token 的统计与撤销。
  - [x] 401/403 重连引导：扩展端提示并可跳转 options 重连。
- [x] 运行 `openspec validate refactor-bilibili-extension-first-ux --strict` 并通过。
