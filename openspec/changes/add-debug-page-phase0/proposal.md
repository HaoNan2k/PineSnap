## Why

PineSnap 的一次 learning 会话横跨 4 个 AI 调用点（`generateClarify` / `generatePlan` / `/api/learn/chat` / `/api/learn/discussion`），数据落在 `Learning` + canvas/chat 两条 `Conversation` + 多张 `Message` 表里。开发者排查"用户某次会话出了什么"时只能手写 SQL 或者翻控制台日志，效率极差。

需要一个开发者向（不面向终端用户）的 `/debug` 内部页面，按 user 或 learning 维度把会话原始数据可视化。本次仅做 Phase 0：**纯 DB 读取**，不接 OTel/Langfuse；架构上预留 trace 入口位，未来 Phase 1 接观测平台时只需启用。

## What Changes

- 新增 `/debug` 路由组（仅 admin role 可访问）：
  - `/debug` — 顶栏分级搜索框入口页：输入 UUID 直接跳到 learning 详情；输入 email/userId 列出该用户所有 learning
  - `/debug/learning/[id]` — 单 learning 详情页：顶部元信息卡 + 双列泳道时间线（左 canvas / 右 chat），消息按 createdAt 全局对齐，chat 消息以连接线指向其 anchor 的 canvas 消息
  - `/debug/user/[id]` — 单用户的 learning 列表页
- 新增 admin 角色机制：用户表新增 `role` 字段（默认 `user`，少数账号设为 `admin`），所有 `/debug` 路由 + `debug` tRPC router 强制 admin 校验
- 新增 `server/routers/debug.ts`，暴露 `searchByQuery` / `getLearningDetail` / `listLearningsByUser` 三个 procedure，全部 admin-only
- 每条 message 卡片显示完整原始数据（id / role / conversationId / createdAt / Δ前一条耗时 / clientMessageId / anchoredCanvasMessageId / deletedAt / parts JSON），不做任何业务翻译
- 顶栏 toggle "显示已删除"，默认隐藏 `deletedAt != null` 的消息；开启时灰显 + 划线
- 每条 message 卡片预留 disabled 的 `Trace ↗` 按钮（hover 提示 "Phase 1 Langfuse 接入后启用"），不影响 Phase 0 主体
- 引入 `react-json-view-lite` 做 JSON 折叠 + 语法高亮

## Capabilities

### New Capabilities
- `debug-console`: 开发者向内部 debug 控制台，提供按 user/learning 维度的会话原始数据可视化能力

### Modified Capabilities
- `auth`: 引入 admin 角色概念，明确 admin-only 路由/接口的鉴权契约

## Impact

- **DB schema**：`User`（或 Supabase 对应表）新增 `role` 字段 + Prisma migration
- **路由**：新增 `app/debug/**`
- **API**：新增 `server/routers/debug.ts`；现有 tRPC root 注册 `debug` namespace
- **依赖**：新增 `react-json-view-lite`（轻量、无依赖）
- **不影响**：现有 learning 流程的所有路由 / API / DB 写入路径；不写测试（debug 页面手动验证）
- **未来铺垫**：Phase 1 只需在 message 卡片里把 `Trace ↗` 接入 Langfuse trace URL，不动页面结构
