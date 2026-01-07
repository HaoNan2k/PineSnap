## 背景 / 问题

当前文件上传与回放依赖本地文件系统 `public/uploads`：

- 云端（Vercel）环境的本地文件系统不适合作为长期持久化存储。
- 聊天消息 `parts` 中仅存储 `ref`（引用），服务端在构造 prompt 时需要按 `ref` 读取 bytes；因此 `ref` 指向的对象必须在云端可长期可读。

同时，公开环境需要默认私有文件，并提供短期可用的预览/下载能力。

## 目标

- 将文件持久化从本地文件系统迁移到 Supabase Storage（dev/prod 两套环境）。
- 默认私有文件（private bucket），并通过 **短期签名 URL** 提供前端预览/下载能力。
- `Message.parts[].ref` 的语义升级为 Supabase Storage 的 object key（稳定引用），DB MUST NOT 存储签名 URL。
- 上传接口 MUST 实施文件大小上限与类型白名单（服务端校验）。

## 非目标

- 不实现 API 代理下载（后续按需再做）。
- 不实现病毒扫描/内容安全（未来会引入；本变更仅预留扩展点）。
- 不实现文件垃圾回收（GC）；本阶段仅明确删除策略为“不级联删文件”（策略 A）。

## 范围

- 文件上传 API：保存到 Supabase Storage，返回 `ref` 与用于即时预览的短签名 URL（不落库）。
- 文件回放：DB→UI 转换通过签名 URL 渲染文件预览。
- Prompt hydration：服务端按 `ref` 从对象存储读取 bytes（图片 bytes-first）。
- 校验：文件大小上限与类型白名单在服务端执行。


