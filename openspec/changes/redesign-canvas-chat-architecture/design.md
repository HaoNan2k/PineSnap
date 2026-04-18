## Context

PineSnap 是 canvas-led 的 AI 学习应用。当前实现里 canvas 和 chat 共用同一条 conversation：
- `/api/learn/chat` 处理所有交互
- `useChat` 在前端单实例同时驱动 canvas 和 chat drawer
- `ChatDrawer` 渲染同一条 conversation 的全部消息历史

`canvas-tool-redesign` change 已强制 AI 在 canvas 模式下用 tool 输出（`toolChoice: "required"` + `presentContent`），但**chat drawer 里的对话仍是同一条 conversation 的视图**——这意味着 AI 的纯文本回复仍可能出现（chat drawer 接收），并被持久化到 canvas 的 conversation 历史里。这是 019bdc0c 卡死会话的根因。

[0003 文档](../../../docs/decisions/0003-canvas-chat-architecture.md) 第 1 节确定的产品方向：canvas 与 chat 在数据、UI、AI 三个层面**完全分离**。本设计落地这个方向。

技术约束（来自 [0002 文档](../../../docs/decisions/0002-canvas-conversation-recovery-strategy.md) 第 4 节）：
- Vercel AI SDK 5 的 `streamText().onFinish` 在 stream abort 时**不触发**（[官方 troubleshooting](https://ai-sdk.dev/docs/troubleshooting/stream-abort-handling)）
- `waitUntil` 是 best-effort，不能用作关键业务逻辑的容器
- 任何持久化设计需要规避这两个陷阱

## Goals / Non-Goals

**Goals:**
- canvas conversation 永远只包含 tool 调用与 tool result，不存在末尾孤立 user text
- chat 完全独立：独立 endpoint、独立 system prompt、独立 message 表行（通过 kind 区分）
- 用户能左右翻看 canvas 历史 step；翻看时 sidebar 显示当时的讨论
- chat AI 能读 canvas 当前 step 与全 history 作为 context；不能改 canvas 进度
- 移除现有 chat drawer，由 sidebar 取代

**Non-Goals:**
- 不做移动端适配（桌面优先；移动端 fallback 留作 future work）
- 不做 chat 消息的 token 限额（早期不限，监控）
- 不实现 stream resumable（experimental_resume 走原生客户端 reconnect 范式，本期不做）
- 不修改 canvas 的 step 渲染逻辑（在 canvas-tool-redesign 之上叠加，不重做）
- 不引入 IndexedDB 本地 draft（pre-PMF 阶段不必，答案体量小）

## Decisions

### 1. 数据模型：双 conversation + anchoring

**决策**：每个 learning 持有两条独立的 Conversation 行，通过 `kind` 字段区分。Chat 消息通过 `anchoredCanvasMessageId` 外键挂到 canvas 的某条 step 消息。

**Schema 变更**：

```prisma
enum ConversationKind {
  canvas
  chat
}

model Conversation {
  // ...existing fields
  kind ConversationKind @default(canvas)
}

model Message {
  // ...existing fields
  anchoredCanvasMessageId String?
  anchoredCanvasMessage   Message? @relation("AnchoredTo", fields: [anchoredCanvasMessageId], references: [id])
  anchoredChats           Message[] @relation("AnchoredTo")

  @@index([anchoredCanvasMessageId])
}
```

**LearningConversation** 仍是 m:n 中间表，但通过 `Conversation.kind` 区分两条 thread。一个 learning 期望恰好关联两条 conversation（canvas 一条、chat 一条），由应用层保证。

**为什么不用单 conversation + tag**：
- 同一张表混存两种 message role 复杂（tool call 与 free text 流转规则不同）
- AI SDK 的 `useChat` 按 conversationId 隔离消息流；分两条 conversation 天然映射两个 useChat 实例
- 查询时 `WHERE kind=canvas` 比 `WHERE tag=...` 显式

**为什么 anchor 在 message 层而非 step 层**：
- 当前没有"step"的物理表，step 是从 canvas conversation 的 message 序列推导
- anchor 到具体 message id 最直接，未来若引入 step 表也可平滑迁移

### 2. canvas conversation 的 step 边界

**决策**：一条 assistant message = 一个 step（即使包含多个 tool call）。与 useChat 的 message 概念对齐。

**对齐原因**：
- useChat 把 message 作为最小单位 emit
- previous 翻页粒度 = message 粒度，最直观
- 多 tool call 在同一 step 内并行展示（已由 canvas-tool-redesign 的 pendingResults Map 支持）

**对应 message 序列模式**：

```
canvas: [system?, user?, assistant(tools), tool(result), assistant(tools), tool(result), ...]
        ↑                ↑ step 1            ↑ step 2

每两个相邻的 assistant msg 之间是一个 user 响应阶段
```

### 3. chat AI 的隔离与 context 注入

**决策**：新建 `POST /api/learn/discussion` endpoint。完全独立于 `/api/learn/chat`：
- 独立 system prompt（`lib/learn/prompts/discussion-system-prompt.ts`）
- **不传任何 tool**（`tools: undefined`）；模型物理上无法调用 tool
- 注入 context：当前 canvas step 的内容 + 全 canvas history 摘要 + 该 step 已有的 chat history

**注入方式**：在 system message 里 inline，例如：

```
You are a tutoring assistant. The user is currently studying:
[current step content]

Their full canvas history (read-only summary):
[step 1 summary] → [step 2 summary] → ... → [current step]

Past discussion on the current step:
[chat history anchored to current step]

Answer questions. Do NOT instruct the user to take any specific action on the canvas. You cannot affect their progress.
```

**为什么不复用 `/api/learn/chat` + 模式开关**：
- 行为差异大（一个必须用 tool、一个禁止用 tool；不同 system prompt）
- 共用容易出 bug（参数错配 → AI 在 chat 里调 canvas 的 tool）
- 独立 endpoint 天然隔离失败域

### 4. UI：collapsible sidebar 替代 drawer

**决策**：拆掉 `components/learn/chat-drawer.tsx`，新建 `components/learn/discussion-sidebar.tsx`。

**布局**：
- 默认收起：右侧一条 ~32px 窄条，含 "?" icon
- 展开宽度：~360px（不挤压 canvas，canvas 区域以 `flex-1` 自然让出）
- 内部布局（垂直）：
  - Header（高 ~48px）：显示 "关于「{当前 step 标题}」" + 折叠按钮
  - Scroll 区（flex-1）：当前 step 锚定的 chat 消息列表
  - 输入框（高 ~64px）：textarea + 发送按钮，固定 sidebar 内底部

**触发**：
- 点击窄条 → 展开
- 键盘快捷键 `Cmd+/`（Mac）/ `Ctrl+/`（Win/Linux）→ 切换展开/收起 + 自动 focus 输入框

**与 step 的同步**：
- `LearnFocus` 维护 `currentCanvasStepId` 状态
- `DiscussionSidebar` 接收 `currentCanvasStepId` prop
- step 切换时 sidebar 重新拉取该 step 的 chat history（via tRPC query 按 anchoredCanvasMessageId 过滤）

### 5. canvas previous 导航

**决策**：在 `LearningCanvas` 组件加左右翻页：
- 左侧屏幕中位边缘：`<` 按钮，显示在 canvas 区域内（不挤 step 内容）
- 右侧（仅在不是最新 step 时）：`>` 按钮回到下一步
- 顶部 progress bar 同时反映当前位置（已有 progress bar 复用）

**翻看历史 step 时的交互态**：
- 显示当时的 tool（quiz/Socratic 等）
- 用户的答案以"已答" state 显示（read-only），不允许重答
- Continue 按钮隐藏（已经是历史，无可继续）
- sidebar 自动跟随显示该 step 的讨论（read-only display 保持一致）

**为什么不允许重答**：
- canvas conversation 是 append-only 历史，重答需要 fork；超出本次 scope
- 用户回看主要为复习，不为重做
- 若未来需要重做，单独立 change

### 6. canvas tool-only 服务端兜底

**决策**：在 `/api/learn/chat` 的 streamText `onFinish` 里检测：若 response 不含任何 tool call，记 error 日志 + 一次性 retry（重发上一个 user message 给模型）。retry 仍失败 → 返回 fallback presentContent（"系统暂时无法生成下一步，请稍后再试或刷新"）。

**为什么需要兜底**：
- `toolChoice: "required"` 是 SDK 层强制，但模型仍可能违反（OpenAI/Anthropic 偶发现象）
- 不兜底 → canvas 状态卡住，用户看见骨架屏
- retry 1 次是经验值，再多容易循环烧 token

**和 0002 的关系**：0002 警告 onFinish 在 abort 时不触发；本兜底逻辑只覆盖"onFinish 触发了但 response 不合规"场景。abort 路径单独处理（见 7）。

### 7. abort 路径处理

**决策**：在 `result.toUIMessageStreamResponse({ consumeSseStream: consumeStream })` 配置 `consumeStream`，确保 abort 时 onFinish 仍触发，并通过 `isAborted` 区分。

**isAborted 时的行为**：
- 不再写任何 message 到 canvas conversation
- 将 user 的输入（最近一条 user/tool message）也回滚
- 前端检测到 abort response → 弹出"网络中断，请重试"提示并允许用户再次提交

**为什么需要回滚 user input**：
- canvas conversation 严格 step 化的前提是任何"半轮"都不留下
- 不回滚 → 下次进页面又是末尾孤立 user 消息 → 退化回 0002 的卡死场景

### 8. 旧脏数据清理

**决策**：一次性脚本 `scripts/cleanup-orphan-conversations.ts`：
- 扫描所有 canvas conversation（按新 schema 加 kind 后）
- 检测末尾是 user/tool 消息（无后续 assistant message）的会话
- 处理方式：把末尾孤立的 user/tool message 软删除（设 `deletedAt`）
- 每条处理记录写入 `scripts/cleanup-report-{timestamp}.json` 用于回滚

**为什么不批量删除**：
- 软删除可逆，万一误判可恢复
- 软删除同样使前端 `getState` 过滤掉这些消息（已支持 `deletedAt IS NULL`）

## Risks / Trade-offs

- **DB migration 风险** → migration 仅新增字段，不破坏现有读取；现有 conversation 的 `kind` 默认为 canvas 兼容历史数据；一次性脚本作为 follow-up
- **chat AI 仍可能"越界"建议用户行动** → system prompt 强约束 + 不给任何 tool；若发现越界案例，加 prompt eval
- **两条 conversation 增加 query 复杂度** → 用 tRPC 一次性聚合输出，前端只看一个聚合 state
- **sidebar 默认收起，用户可能根本发现不了** → 初次进入 learning 时 onboarding tooltip 提示一次（不在本 change scope，留作 follow-up）
- **canvas 兜底重生成可能产生不一致内容**（同一题被生成两次但答案不同）→ 兜底只在"无 tool call"时触发，模型已经吐过 token 的内容会被丢弃；用户感知是"加载稍长一点"
- **abort 回滚 user input 可能让用户感觉"我刚才的答案怎么没了"** → 前端在回滚后立刻 re-render 原 step 的 quiz（用户的本地 state 还在），用户看到的是"按钮可点"而不是"答案消失"；流畅恢复

## Migration Plan

**Phase 1 · 数据模型 + 服务端基础设施**（无 UI 改动）
1. Prisma schema 加 `Conversation.kind` 与 `Message.anchoredCanvasMessageId`
2. 跑 migration（dev + 生产）
3. 现有 conversation 默认 `kind=canvas`
4. 新建 `lib/db/discussion.ts`，封装 chat conversation 的 CRUD
5. 新建 `/api/learn/discussion/route.ts`，独立 endpoint（暂未被前端调用）
6. `lib/learn/prompts/discussion-system-prompt.ts`

**Phase 2 · canvas tool-only 加固 + abort 处理**
1. 在 `/api/learn/chat` 加 `consumeSseStream: consumeStream`
2. onFinish 检测无 tool → retry 一次 → fallback presentContent
3. abort path 回滚 user input
4. 前端处理 abort response（提示 + 允许重试）

**Phase 3 · 前端 UI 重构**
1. 删除 `chat-drawer.tsx` + `toDisplayMessages`
2. 新增 `discussion-sidebar.tsx`、`canvas-step-navigation.tsx`
3. `learn-focus.tsx` 改为双 useChat 实例
4. step 状态管理 + sidebar 同步

**Phase 4 · 旧数据清理**
1. 实现 cleanup script
2. dry-run 跑一遍，输出 report
3. 人工 review report
4. 实跑（或决定保留）

**Rollback**：每 phase 独立可回滚。schema 变更只新增字段，旧代码兼容。前端 UI 重构通过 feature flag 包裹（如 `NEXT_PUBLIC_ENABLE_DISCUSSION_SIDEBAR`），出问题立刻关掉回到旧 chat drawer。

## Open Questions

1. **Sidebar 在某 step 没有讨论时的空状态文案**——交给设计阶段决定
2. **chat AI 的模型选择**——用更便宜的 Haiku/GPT-mini？还是和 canvas 一样用 GPT-5.2？建议先用同一模型，监控成本后调整
3. **快捷键 `Cmd+/` 是否和现有快捷键冲突**——需要 audit `keybindings.json` 与 lucide 编辑组件
4. **学习 plan 改写**：现有 plan 里有"AI 在适当时间用文字解释"这种描述吗？需扫描 prompts 并更新
5. **canvas-tool-redesign 的 task 7（手动验证）**——是否需要在本 change 启动前先完成？建议是
