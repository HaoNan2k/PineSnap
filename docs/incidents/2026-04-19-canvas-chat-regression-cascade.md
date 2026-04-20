# 2026-04-19 · Canvas + Chat 架构落地后 5 个层叠 regression

## 现象

2026-04-19 ~ 2026-04-20 对 feat/learning-experience（commits `fd101f0..817a61d`，0003 Canvas+Chat 架构重设计）做 QA 时，**一条路径上 5 个 bug 按顺序遮蔽**——前 4 个一起出现，第 5 个是修前 4 个时引入的新回归：

| # | 症状 | 说明 |
|---|------|------|
| 1 | 新建 learning 走完 clarify 后 canvas 永远停在骨架屏 | Continue 按钮 disabled、未生成首 step |
| 2 | 修完 1 后 sidebar 提问 400 "Invalid UUID" | `anchorMessageId` 为空字符串 |
| 3 | 修完 2 后刷新页面 sidebar 完全空 | tRPC 已返回历史消息但 UI 看不到 |
| 4 | 修完 3 后 live session 提问仍 400 | anchor 是短 nanoid 不是 UUID |
| 5 | 修完 1-4 后继续学习到 step N，tool 全部作答后 Continue 再点会把 canvas 对话彻底卡死 | OpenAI 400 "No tool output found for function call …"，整条 canvas conversation 坏掉 |

每个都 P0-P1，合起来直接让 0003 的"canvas + 助教跨 step 答疑"核心价值完全走不通。

## 复现（fix 前）

### 前 4 个

1. `/sources` 新建一个 learning
2. 完成 clarify 3 道题 → "生成学习计划"
3. 进入 `/learn/<id>` → **停在骨架，Continue 点不动**（bug 1）
4. 假设 bug 1 修了 → 展开 sidebar 输入问题 → 发送 → 400（bug 2）
5. 假设 bug 2 修了，刷新页面 → sidebar 对话历史全丢（bug 3）
6. 假设 bug 3 修了，不刷新页面直接在 live session 下提问 → 400（bug 4）

### 第 5 个

7. 假设 bug 1-4 修了，走到一个带多个 tool 的 step（presentContent + renderQuizSingle）
8. 答完 quiz，点 Continue。正常情况 `addToolResult` 把两条 tool-result 提交，sendAutomaticallyWhen 触发下一 turn
9. **在 addToolResult 已经把 tool 状态改成 output-available、但 sendAutomaticallyWhen 还没发出请求的那几毫秒**里再点 Continue（或者 auto-send 因网络/错误没完成），我的 `canContinue` 返回 true，handleContinue 发一条 user "Continue" 文本
10. 这条 text 被持久化到 DB，位置在 assistant tool-calls 之后、缺 tool-result，OpenAI 后续调用全部 400

## 根因

按层剥开，五个根因各自独立：

### 1. `handleContinue` 丢了 `sendMessage("Continue")`

`components/learn/learn-focus.tsx`（commit 655f6af 重构时）：

- `canContinue` 在 `pendingTools.length === 0` 时返回 false
- `handleContinue` 只剩 `addToolResult` 提交已有 tool 结果的分支，彻底移除了旧代码里的 `sendMessage({ parts: [{ type: "text", text: "Continue" }] })`

空 canvas（没有任何 assistant 消息）就没 tool → canContinue = false → 永远点不动 → 首 step 永远不生成。

### 2. `pendingAnchor` 用 useState 造成 race

`components/learn/use-discussion-chat.ts`：

```ts
setPendingAnchor(anchorMessageId);
await sendMessage({...});  // 闭包读 pendingAnchor，仍是 null
```

`setState` 异步；transport 的 `prepareSendMessagesRequest` 在下一个 tick 前先同步执行，读到的是旧值 null → 发 `anchorMessageId: ""` → schema 挂 `z.string().uuid()`。

### 3. useChat 的 `messages` prop 只在 mount 读一次

`components/learn/use-discussion-chat.ts`：

```ts
useChat({ id, messages: initialMessages, transport })
```

`initialMessages` 来自 `trpc.learning.getDiscussion.useQuery`。tRPC 查询在挂载后才 resolve，但 useChat 的 `messages` 参数**只在第一次 mount 读取**，后续变更不会进入 useChat 内部状态。于是刷新后 UI 永远是空状态，即使 DB 有历史消息。

### 4. 客户端 UI id ≠ DB id

详见 [0004](../decisions/0004-live-session-message-id.md)。简述：AI SDK useChat 给 streaming 消息分配 16 字符 nanoid，DB 行走 `uuid(7)` 默认值。sidebar 读 `latestCanvasMessageId` 时在 live session 拿到的是 nanoid，服务端 `z.string().uuid()` 直接拒。

### 5. 修 1 时引入的 `canContinue` 新歧义

第 1 步的 fix（commit `b7ce55d`）里，我把 `canContinue` 在 `pendingTools.length === 0` 时改成 `return true`，让空 canvas 能点 Continue 起首 step。问题：`pendingTools.length === 0` 有**两种**状态重合：

- (a) 空 canvas：还没有 assistant 消息，`currentToolInvocations = []`
- (b) **所有 tool 都已返回 output**：`isReadOnly=true` 会把 tool 从 `pendingTools` 里过滤掉（`isReadOnly` 派生自 `state.startsWith("output-") || result !== undefined`）

状态 (b) 在 `addToolResult` 之后就会成立。如果用户此时再点一下 Continue（想快进、或者 auto-send 因为网络/错误没跟上），handleContinue 的 `pendingTools.length === 0` 分支会发一条 user "Continue" 文本，而不是等 sendAutomaticallyWhen 正常走 tool-result 提交。这条 user 文本落在"有未 resolved tool-call 的 assistant"后面，OpenAI 协议上非法，下一次调用必 400。

## 修复

两个 commit：

**`b7ce55d fix(learn): unbreak canvas kickoff, discussion anchor, and sidebar hydration`** —— 修 1-4：

| 根因 | 文件 | 手法 |
|------|------|------|
| 1 | `components/learn/learn-focus.tsx` | `canContinue` 无 tools 时返 true；`handleContinue` 空 tools 分支走 `sendMessage("Continue")` |
| 2 | `components/learn/use-discussion-chat.ts` | `pendingAnchor` state → `pendingAnchorRef` ref；transport 闭包读 ref.current |
| 3 | `components/learn/use-discussion-chat.ts` | 加 `useEffect` + `hydratedRef` 首次水合 `setMessages(initialMessages)` |
| 4 | `app/api/learn/chat/route.ts` + `lib/db/message.ts` | 服务端 `uuidv7()` 预生成 + stream start 带 messageId + `createMessage` 接受 `explicitId`；`latestCanvasMessageId` 跳过空占位 |

**`680c93b fix(learn): don't let Continue send plain text when a turn already has tool outputs`** —— 修 5：

按 `lastMessage.role` 分支，只在无 assistant 消息时允许 Continue 发文本；assistant turn 里 tool 全部完成的窗口里 `canContinue` 返 false，交给 sendAutomaticallyWhen 驱动。

**DB 清理**：019da229 这条 learning 的 canvas conversation 在第 5 个 bug 发作时被坏消息卡死（末尾有条 orphan user "Continue"）。用 soft-delete（`deletedAt = now()`）清理该行，CLAUDE.md 禁止物理删但 soft-delete 是合规路径。

验证：docs/verification/2026-04-19-canvas-chat-architecture.md 的 §1-§7 全部 PASS（含 §3 跨 step 引用、§4 解耦、§6 双流并发三项关键断言）。第 5 个 bug 修复后回到 019da229 再验：Continue 在 quiz 未答时正确 disabled，答完后能正常推进。

## 预防

**QA 方法论教训——这次最大的收获**：发现多个 bug 时，不要一次改完再重跑。正确节奏是"改一个 → 跑一遍 → 下一个露头再改"。原因：

- bug 1 藏在最表层，不修根本看不到 bug 2 存在的条件（需要一个 step 才能提问）
- bug 2 不修看不到 bug 3（需要真有一条 persisted discussion message）
- bug 3 不修看不到 bug 4（刷新后 sidebar 空，根本没机会在 live session 发问）
- bug 5 只在"用户真正走完一个带 A2UI 的 step 并点 Continue"时暴露——这是 QA 脚本里最容易漏跑的真实用户路径

如果一次把多个 bug 都推测着改完，很可能只修对 1-2 个、漏掉另外的，或像 bug 5 那样**在修前面的过程中引入新回归**，而测试会因为修对的那部分通过、错误地以为全 OK。**每层 fix 验证一次**是对付层叠 bug 的唯一稳妥节奏。

**工程侧建议**：

- 未来新增类似"客户端发 anchor → 服务端校验 DB id"的路径，沿用 0004 的契约（server 预生成 + stream 回写），不要再假设客户端能拿到 DB id
- useChat 初始化参数是"fire-and-forget"语义，依赖 tRPC/SWR 等异步数据的场景必须走 useEffect + setMessages 水合，不能靠 props 传递
- 当一个状态门（`canContinue`、`isBusy` 等）派生自多个来源，且任一来源的为真能让门通过时，检查**所有来源空集是否都代表同一种业务含义**——这次 bug 5 就是"empty canvas"和"turn 内 tool 全完成"这两种完全不同的状态经过 `pendingTools = []` 收敛成同一个门
