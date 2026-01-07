## Tasks

1. [ ] 创建 Supabase Storage（当前先完成 dev；prod 后续再做）：
   - [x] `dev`：创建 private bucket
   - [ ] `dev`：配置基础访问策略（仅 owner 可读写；或先仅服务端读写）
   - [ ] `prod`：创建 private bucket（后续再做）
   - [ ] `prod`：配置基础访问策略（后续再做）
2. [ ] 环境变量（当前先完成 dev；prod 后续再做）：
   - [x] `dev`：`SUPABASE_URL`
   - [x] `dev`：`SUPABASE_ANON_KEY`
   - [x] `dev`：`SUPABASE_SERVICE_ROLE_KEY`（服务端）
   - [ ] `prod`：以上变量（后续再做）
3. [ ] 存储适配（实现阶段）：
   - [x] `ref` 语义升级为 Supabase object key
   - [x] 上传：写入 Storage，返回 `{ ref, url(signed), mediaType, size, name }`
   - [x] 回放：通过 `ref` 生成短签名 URL
   - [x] prompt hydration：通过 `ref` 下载 bytes（图片 bytes-first；文本文件抽取注入）
4. [ ] 上传安全校验（实现阶段）：
   - [x] 文件大小上限（初始可沿用 5MB）
   - [x] 类型白名单（服务端校验，基于 sniffing + 声明类型）
5. [ ] 回归验证（手动）：
   - [ ] 上传图片后可在 UI 预览（signed URL）
   - [ ] 刷新页面/历史回放仍可预览（需重新生成 signed URL）
   - [ ] 图片可被喂给模型（bytes-first）
   - [ ] 非白名单类型或超大小文件被拒绝（400）


