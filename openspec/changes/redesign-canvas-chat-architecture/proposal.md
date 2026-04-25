## Why

PineSnap 当前 canvas 和 chat 共用同一条 conversation，互相污染——AI 用纯文本"追问"用户后，用户在 chat 抽屉里答的回复会以末尾孤立 user 消息的形式留在 DB（如 019bdc0c 会话），导致 canvas 渲染逻辑卡死在骨架屏。表层是 bug，根因是产品定位没划清。

详细背景、产品决策依据、用户视角设计推演见 [docs/decisions/0003-canvas-chat-architecture.md](../../../docs/decisions/0003-canvas-chat-architecture.md)（衍生自 [0002 · 中断恢复策略](../../../docs/decisions/0002-canvas-conversation-recovery-strategy.md)）。

## What Changes

- **数据模型变更**：每个 learning 持有两条 conversation：`canvas`（严格 tool-only，进 history）和 `chat`（自由文本对话）；chat 的每条消息 anchored 到 canvas 的某一 step
- **canvas previous 导航**：用户可在 canvas 上左右翻页查看历史 step，每个历史 step 显示当时的题、答案和当时的讨论
- **右侧 collapsible sidebar UI**：移除现有右滑 chat drawer；新增 sidebar，默认收起只露 "?" 窄条；展开后内含 header（"关于「当前 step」"）/ 滚动讨论区 / 底部输入框
- **sidebar 跟随 step 切换**：用户翻 previous 时，sidebar 自动刷新为对应 step 锚定的讨论
- **新增 chat AI endpoint**：`POST /api/learn/discussion`，独立 system prompt，注入 canvas 当前 step 作为 context，**仅输出 text，禁用所有 tool 调用**
- **canvas tool-only 兜底加强**：在 `canvas-tool-redesign` 已实现的 `toolChoice: "required"` 基础上，增加服务端兜底——若 streamText 返回的 message 不含 tool call，记日志 + 单次 retry
- **旧脏数据清理脚本**：扫描 DB 中"末尾是 user text"的会话（包括 019bdc0c），统一识别并清理 / 标记
- **BREAKING**: 现有 chat drawer 组件移除，前端 `ChatDrawer` / `toDisplayMessages` 不再使用

## Capabilities

### New Capabilities
- `step-anchored-discussion`: 学习讨论作为独立 chat conversation，每条消息 anchored 到 canvas 的某一 step；包含独立 endpoint、context 注入、跨 step 隔离行为

### Modified Capabilities
- `chat-conversation`: 引入 `kind` 字段区分 canvas / chat 两种 conversation；定义 learning 持有两条 conversation 的关系
- `chat-storage`: Message 表新增 `anchoredCanvasMessageId` 字段（chat conversation 的消息引用 canvas conversation 的 step）；Conversation 表新增 `kind` 枚举字段
- `chat-ui`: 移除 chat drawer 形态；新增右侧 collapsible sidebar 形态（默认收起、点击展开、内部含 header/scroll/input）；sidebar 内容跟随当前 canvas step 切换
- `assisted-learning-loop`: 支持 canvas 历史 step 的 previous 导航（左右翻页查看历史、查看时显示当时讨论）；canvas tool-only 增加服务端兜底逻辑

## Impact

**数据层**
- `prisma/schema.prisma`: `Conversation` 新增 `kind` 枚举字段；`Message` 新增 `anchoredCanvasMessageId` 外键；migration
- `lib/db/conversation.ts`、`lib/db/message.ts`: 新增方法支持 kind 过滤、anchoring 查询
- 一次性脚本：`scripts/cleanup-orphan-user-messages.ts`

**服务端**
- 新增 `app/api/learn/discussion/route.ts`：chat AI endpoint，独立 system prompt
- `app/api/learn/chat/route.ts`：增加 tool-only 兜底（无 tool call 时 retry）
- `server/routers/learning.ts`：`getState` 返回值新增 chat conversation 数据；新增 step navigation 相关 procedure
- `lib/learn/prompts/`: 新增 `discussion-system-prompt.ts`，强制只输出 text、声明无 tool 能力

**前端**
- 删除/废弃：`components/learn/chat-drawer.tsx`、`toDisplayMessages` helper
- 新增：`components/learn/discussion-sidebar.tsx`（右侧 sidebar 容器 + 折叠逻辑）
- 新增：`components/learn/canvas-step-navigation.tsx`（previous 导航 UI）
- 修改：`components/learn/learn-focus.tsx`（双 useChat：一个对 canvas，一个对 discussion；step 状态管理）
- 修改：`components/learn/learning-canvas.tsx`（支持显示历史 step、隐藏当前 step 时锁定交互）

**类型与协议**
- `lib/chat/types.ts`：新增 conversation kind 枚举，message anchoring 类型
- tRPC schema：getState 输出更新

**依赖**：无新增 npm 依赖。继续使用 useChat、tRPC、Prisma。

**和已有 change 的关系**：本 change 在 `canvas-tool-redesign`（已基本完成）之上叠加。canvas-tool-redesign 的 tool-only 强制是本 change 的前置基础。
