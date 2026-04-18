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

### 1. 数据模型：双 conversation + Light Anchor

**决策**：每个 learning 持有两条独立的 Conversation 行，通过 `kind` 字段区分。Chat 消息通过 `anchoredCanvasMessageId` 外键挂到 canvas 的某条 assistant message——但**这个 anchor 只是元数据，UI 默认不按它过滤**（详见决策 4）。

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

**LearningConversation** 仍是 m:n 中间表，但通过 `Conversation.kind` 区分两条 thread。一个 learning 关联恰好一条 canvas conversation + 至多一条 chat conversation；通过 `LearningConversation` 上 `(learning_id, conversation.kind)` 的应用层 + 索引层唯一性保证。

**Anchor 的作用范围**（关键澄清，回应 Light Anchor 决策）：
- **写入时**：服务端必须根据请求体携带的 `anchorMessageId` 写入 anchor。客户端在用户提交那一刻 freeze 当时的 currentCanvasStepId 并传给服务端，**不要让服务端按"接到请求时的 canvas state"推断**——后者会因用户中途翻 previous 而 race。
- **读取时**：默认查询 chat conversation 全量，不按 anchor 过滤。anchor 仅作为 message 元数据存在。
- **未来用法**：可能的 sidebar filter toggle、chat 数据分析、anchor-based context summarization 等。schema 已支持，无需 migration。

**Anchor 完整性约束**（应用层）：`createDiscussionMessage` 写入前必须校验：
1. 目标 conversation 是 `kind=chat`
2. anchor 指向的 message 属于**同一 learning** 的 canvas conversation
3. anchor 指向的 message 是 `role=assistant`（即一个 step 的开端，不是 user/tool message）

校验失败 → 直接报 500，不给写入。配单元测试覆盖三类违反场景。

**为什么不用单 conversation + tag**：
- 同一张表混存两种 message role 复杂（tool call 与 free text 流转规则不同）
- AI SDK 的 `useChat` 按 conversationId 隔离消息流；分两条 conversation 天然映射两个 useChat 实例
- 查询时 `WHERE kind=canvas` 比 `WHERE tag=...` 显式

**为什么是 Light Anchor 而不是 anchor-driven UI**：
- 学习场景下用户经常需要 AI 跨 step 关联（"你之前说 X，这道题是不是同样问题"）
- 如果 sidebar 按 anchor 切换显示当前 step 的讨论，AI 也只看当前 step → 失去 cross-step 上下文 → 答疑质量降级
- Flat sidebar + AI 看全量讨论 = 用户认知最轻 + AI 答疑质量最高
- Anchor 字段保留作为元数据，未来如果用户反馈"想看当时这步讨论"，加 sidebar filter toggle 即可，不动 schema

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
- 注入 context：**整段 chat conversation 历史**（来自 useChat messages 数组）+ canvas history 地图摘要

**注入方式**：integration via system + messages array：

```
[system message]
You are a tutoring assistant for this learning session. The user is studying through a structured canvas of steps.

Their full canvas history map:
- step 1: RLS basics (Socratic question)
- step 2: anon_key safety (multiple choice)
- ...
- step N (current): which user is now on

Answer the user's questions about the material. You can reference earlier steps and your prior discussion freely. You CANNOT affect canvas progression — do NOT instruct the user to take specific actions on the canvas.

[user/assistant messages...]
[the entire chat conversation history is replayed here as turns]
[user's latest question]
```

**Token cost 控制**：
- canvas history 只放每 step 的题目主题（短摘要），不放 tool args 全文
- chat conversation 全量回放——这是 Light Anchor 决策的代价，必须接受
- 当 chat 增长到一定量级（比如单 learning > 100 条 message），开始显式截断或滑窗摘要——但不在 P0 做
- P0 加日志：每次 discussion 请求记录 `chatHistoryMessageCount` 与 `totalContextTokens`，便于后续观测决定何时上 token 优化

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
  - Header（高 ~48px）：显示 "AI 助教" + 折叠按钮（**不绑定 canvas step**）
  - Scroll 区（flex-1）：**整段 chat conversation 时间线**（最旧在上，新消息追加在下，自动滚到底）
  - 输入框（高 ~64px）：textarea + 发送按钮，固定 sidebar 内底部

**触发**：
- 点击窄条 → 展开
- 键盘快捷键 `Cmd+/`（Mac）/ `Ctrl+/`（Win/Linux）→ 切换展开/收起 + 自动 focus 输入框
- **快捷键冲突 audit**：实施前检查 `~/.claude/keybindings.json` 与现有应用 hotkey 是否占用 `Cmd+/`。若冲突，回退到 `Cmd+J` 或类似

**与 canvas 的关系**：
- sidebar **完全独立于 canvas 当前 step**。用户翻 previous 时 sidebar 不切换内容
- `LearnFocus` 维护 `displayedCanvasStepId`（用于 canvas previous）和 `latestCanvasStepId`（最新 step 的 message id）
- 用户提交 discussion 时，请求体里 freeze 的 anchor = `latestCanvasStepId`（不是 displayed），表达"用户在最新 step 状态下提的问"
- 翻看历史 step 时仍然可以提问，anchor 仍然是 latest，元数据语义清晰

### 5. canvas previous 导航

**决策**：在 `LearningCanvas` 组件加左右翻页：
- 左侧屏幕中位边缘：`<` 按钮，显示在 canvas 区域内（不挤 step 内容）
- 右侧（仅在不是最新 step 时）：`>` 按钮回到下一步
- 顶部 progress bar 同时反映当前位置（已有 progress bar 复用）

**翻看历史 step 时的交互态**：
- 显示当时的 tool（quiz/Socratic 等）
- 用户的答案以"已答" state 显示（read-only），不允许重答
- Continue 按钮隐藏（已经是历史，无可继续）
- **sidebar 不变化**——继续显示整段 chat conversation（与翻 previous 无关）

**为什么不允许重答**：
- canvas conversation 是 append-only 历史，重答需要 fork；超出本次 scope
- 用户回看主要为复习，不为重做
- 若未来需要重做，单独立 change

### 5b. step 边界的边界情况

**问题**：useChat 在某些场景下可能让 AI **连续 emit 两条 assistant message** 而不等用户响应（例如服务端 `streamText` 因配置或 model 行为多步执行）。"一条 assistant message = 一个 step" 的定义在这种场景下含糊。

**决策**：treat consecutive assistant messages as **separate steps**（previous 翻页时各自占一页）。理由：
- 用户视角上每条 assistant message 是独立的"内容/题"，分别翻页直观
- 如果合并显示，单页内容可能过长
- 实际上当前设置 `stopWhen: stepCountIs(5)` 已限制单 round 内最多 5 步——多 step 是 by design

实施时验证：在 dev 模拟一次 multi-step round（比如让模型连续 emit 2 个 presentContent），确认前端正确渲染为 2 页 previous。

### 6. canvas tool-only 服务端兜底

**决策**：在 `/api/learn/chat` 的 streamText `onFinish` 里检测：若 `isAborted=false` 且 response 不含任何 tool call，记 error 日志 + 一次性 retry（重发上一个 user message 给模型）。retry 仍失败 → 写入 fallback presentContent message（"系统暂时无法生成下一步，请稍后再试或刷新"）。

**关键约束**：retry 逻辑**仅在 `isAborted=false` 时执行**。abort 路径不走 retry（见 §7）。代码上这两条路径必须在 onFinish 入口处用 `if (isAborted) { ... return }` 显式分流。

**为什么需要兜底**：
- `toolChoice: "required"` 是 SDK 层强制，但模型仍可能违反（OpenAI/Anthropic 偶发现象）
- 不兜底 → canvas 状态卡住，用户看见骨架屏
- retry 1 次是经验值，再多容易循环烧 token

**和 0002 的关系**：0002 警告 onFinish 在 abort 时不触发；加上 `consumeStream` 后会触发，但 isAborted=true。兜底 retry 仅覆盖"正常 finish 但 response 不合规"场景。

### 7. abort 路径处理

**决策**：在 `result.toUIMessageStreamResponse({ consumeSseStream: consumeStream })` 配置 `consumeStream`（来自 `ai` 包），确保 abort 时 onFinish 仍触发，并通过 `isAborted=true` 区分。

**isAborted 时的行为**（onFinish 入口处先 check 这个 flag）：
- ✗ 不再写任何 assistant message
- ✗ 不走 §6 的 tool-only 兜底 retry
- ✓ 软删除本轮已写入的 user/tool message（在 LLM 调用前写的那条）
- ✓ 客户端检测到 abort response → 弹出"网络中断，请重试"提示并允许用户再次提交

**为什么需要回滚 user input**：
- canvas conversation 严格 step 化的前提是任何"半轮"都不留下
- 不回滚 → 下次进页面又是末尾孤立 user 消息 → 退化回 0002 的卡死场景

**实现关键代码骨架**：

```ts
onFinish: async ({ response, isAborted }) => {
  if (isAborted) {
    // path A: rollback user input, no further work
    await softDeleteMessage(currentUserMessageId)
    return
  }
  const hasToolCall = response.messages.some(m => /* check */ )
  if (!hasToolCall) {
    // path B: retry once
    const retryResult = await retryStreamText(...)
    if (!hasToolCall(retryResult)) {
      await persistFallbackPresentContent()
    } else {
      await persistMessages(retryResult.messages)
    }
    return
  }
  // path C: happy path
  await persistMessages(response.messages)
}
```

三条路径互斥，各自独立测试。

### 8. 旧脏数据清理

**决策**：一次性脚本 `scripts/cleanup-orphan-conversations.ts`：
- 扫描所有 `kind=canvas` conversation
- 算法：从尾向前找连续的 user/tool message 链（直到遇到 assistant 为止），全部软删除
- 因此 streak 场景（多次失败造成的多条孤立尾巴）也能正确处理
- 每条处理记录写入 `scripts/cleanup-report-{timestamp}.json` 用于回滚审计
- 提供 `--dry-run` 模式只输出报告不写库

**算法 pseudo-code**：

```
for each canvas conversation:
  msgs = messages where deletedAt IS NULL ORDER BY createdAt
  trailing = []
  for msg in reverse(msgs):
    if msg.role == 'assistant': break
    trailing.append(msg)
  if trailing not empty:
    log to report
    if not dry_run: soft delete all in trailing
```

**测试用例必须覆盖**：
1. 正常会话（末尾是 assistant）→ 不动
2. 末尾单条孤立 user → 软删 1 条
3. 末尾 user + tool（用户答了 quiz 但 AI 没回）→ 软删 2 条
4. 多次失败 streak（user, tool, user, tool）→ 软删 4 条
5. 19bdc0c 这条会话的实际形态（end with assistant text + user text）→ 软删 2 条

## Risks / Trade-offs

- **DB migration 风险** → migration 仅新增字段，不破坏现有读取；现有 conversation 的 `kind` 默认为 canvas 兼容历史数据；一次性脚本作为 follow-up
- **chat AI 仍可能"越界"建议用户行动** → system prompt 强约束 + 不给任何 tool；若发现越界案例，加 prompt eval
- **两条 conversation 增加 query 复杂度** → 用 tRPC 一次性聚合输出，前端只看一个聚合 state
- **sidebar 默认收起，用户可能根本发现不了** → 初次进入 learning 时 onboarding tooltip 提示一次（不在本 change scope，留作 follow-up）
- **canvas 兜底重生成可能产生不一致内容**（同一题被生成两次但答案不同）→ 兜底只在"无 tool call"时触发，模型已经吐过 token 的内容会被丢弃；用户感知是"加载稍长一点"
- **abort 回滚 user input 可能让用户感觉"我刚才的答案怎么没了"** → 前端在回滚后立刻 re-render 原 step 的 quiz（用户的本地 state 还在），用户看到的是"按钮可点"而不是"答案消失"；流畅恢复
- **anchor validator 多一次 query** → discussion 写入频率本来就低，多 1 query/写入可接受；将来如成为热点，可改为 join + 一次 query 完成校验 + 写入
- **getDiscussion 一次拉全量** → MVP 不分页，长 learning（>500 chat messages）需要 pagination；spec 暂记 future work

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

**Rollback**：
- Phase 1（schema migration）**不可回滚**——只新增字段，向后兼容，但一旦写入新数据就回不去。可接受，因为字段独立、无破坏性
- Phase 2（abort + retry）独立 endpoint 行为，可通过 git revert 单独回退
- Phase 3（前端 UI）通过 feature flag `NEXT_PUBLIC_ENABLE_DISCUSSION_SIDEBAR` 包裹。Flag off → 回退到旧 chat drawer + 旧 LearnFocus 状态管理。**注意**：flag 只能回滚前端，回滚不了 Phase 1+2 的服务端变更
- Phase 4（脏数据清理）通过 dry-run + 软删除实现可逆——任何被误删的 message 通过 `UPDATE messages SET deletedAt = NULL WHERE ...` 恢复，依赖 cleanup-report 文件做精确回滚

## Open Questions

1. **Sidebar 空状态文案**（用户从未提问过的 learning）——交给设计阶段决定
2. **chat AI 的模型选择**——用更便宜的 Haiku/GPT-mini？还是和 canvas 一样用 GPT-5.2？建议先用同一模型，监控成本后调整
3. **快捷键 `Cmd+/` 是否冲突**——已在 §4 决策中加入 audit 任务；实施前 grep `~/.claude/keybindings.json` 与 `next.config.ts` 等
4. **学习 plan 改写**：现有 prompts 里有没有"AI 用文字追问"的指引？需要 grep `lib/learn/prompts/*.ts` 扫一遍
5. **canvas-tool-redesign 的 task 7（手动验证）**——必须在本 change 启动前完成（确认 tool-only 行为已稳定，再叠 abort + retry 兜底逻辑）
