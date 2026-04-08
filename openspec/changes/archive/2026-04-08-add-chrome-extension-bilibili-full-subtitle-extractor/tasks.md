# 任务清单：Chrome 扩展全量字幕采集（单主路径执行）

- [x] 明确并冻结 extractor registry 约束（唯一 provider、统一返回类型、优先级短路规则）
- [x] 设计并实现 Chrome 扩展最小分层（content script / background / shared extractors）
- [x] 实现“全量字幕优先” extractor：页面上下文提取 → 字幕轨发现 → 字幕 body 规范化为 `transcript.lines[]`
- [x] 保留既有 AI 小助手面板 extractor 代码路径（不得删除旧文件）
- [x] 调整 registry：默认仅执行 `bilibili_full_subtitle_v1`，应用层不再调用 AI 面板 fallback
- [x] 为 `api.bilibili.com` 请求启用登录态凭据策略，避免匿名视角导致字幕轨缺失
- [x] 增加 `cid` 反查兜底（仅可验证查询，不允许伪造），并记录 `cidSource` 观测字段
- [x] 保持 payload key 与响应契约兼容：`VideoCapturePayloadV1` 与 `{ ok: true, resourceId: string }` 不变；按需使用可选 `metadata.captureDiagnostics`（服务端已校验并原样入库）
- [ ] 部署侧配置 `CAPTURE_CORS_ALLOWED_ORIGINS`（含 `chrome-extension://<id>`），验证 Service Worker `fetch` PineSnap 不再被 CORS 拦截
- [x] 验证服务端持久化行为不变：`Resource.content` 原样存储、`Resource.id` 生成机制不变、无 schema 迁移
- [x] 增加失败语义与观测字段（至少包含 provider 与失败码）
- [ ] 手动回归（@Browser）：有字幕视频、无字幕视频、分 P 视频、登录态差异、网络异常路径
- [x] 编写 `docs/` 文档：Chrome 扩展开发流程、本地加载方式、调试方法、发布前验证清单
- [ ] 按文档执行一次完整发布前演练（不要求上架商店）：加载扩展 → 配置 token → 采集成功/失败路径验证
- [x] 运行 `openspec validate add-chrome-extension-bilibili-full-subtitle-extractor --strict`
