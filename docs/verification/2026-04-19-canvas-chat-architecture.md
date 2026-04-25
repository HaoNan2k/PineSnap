# 用户验证步骤：Canvas + Chat 架构重设计

> 配套变更：[openspec/changes/redesign-canvas-chat-architecture/](../../openspec/changes/redesign-canvas-chat-architecture/)
> 决策文档：[docs/decisions/0003](../decisions/0003-canvas-chat-architecture.md)
> 预计时间：20-30 分钟

## 前置

- [ ] Docker Desktop 已启动
- [ ] `supabase start` 本地栈在跑
- [ ] `pnpm prisma migrate deploy` 已把 `20260418161049_add_conversation_kind_and_anchor` 应用到本地
- [ ] `pnpm dev` 起本地服务器（默认 http://localhost:3000）
- [ ] 浏览器登录本地账号

## 1. 首次进入新 learning（基本流）

1. 从首页创建一个新 learning（任选一个资源）
2. 走完澄清阶段（clarify questions），提交 → 生成学习计划
3. 进入 `/learn/[id]` 页面
4. **应看到**：
   - canvas 占满屏幕除右侧一小竖条
   - 右侧约 32px 窄条有个对话气泡 icon
   - canvas 上是第一个 step 的内容（多半是 presentContent 讲解）
   - 底部 Continue 按钮

## 2. sidebar 展开与收起

1. 点右侧窄条 → sidebar 滑出，约 360px 宽
2. **应看到**：
   - sidebar 顶部写 "AI 助教"
   - 中间是空状态提示"有什么问题可以问我"
   - 底部输入框 placeholder "问点什么..."
3. 按 `Cmd+/`（Mac）或 `Ctrl+/`（Win/Linux）→ sidebar 应收起
4. 再按一次 → 展开且输入框自动获得焦点
5. 点展开 header 的右箭头 icon → 收起

## 3. 跨 step 答疑（关键用户价值）

1. 在 canvas 上完整走 3-4 个 step（记下每步的主题）
2. 到某一步（比如 step 3）时，不点 Continue，先展开 sidebar
3. 打字："能给个例子吗"→ 回车
4. **应看到**：
   - message 立即出现在 sidebar（灰绿色气泡，右对齐）
   - 消息下方有小字 "在 step 3 时问的"
   - 片刻后 "思考中..." 提示
   - AI 文本流式回复在其后
5. 继续在 canvas 上走到 step 5
6. 在 step 5 的 sidebar 再问："刚才你说的例子，在这道题里对应什么"
7. **应看到**：AI 能引用 step 3 讨论的内容继续答疑（跨 step 上下文验证，**这是这次改造最大的价值**）

## 4. canvas previous 导航（历史回看）

1. 学到 step 5 后，点 canvas 左侧边缘的 `<` 按钮
2. **应看到**：
   - canvas 切到 step 4（或更早的 step）
   - 用户当时答的选项高亮显示
   - 选项**不可再点**
   - Continue 按钮**不显示**，取而代之是"这是历史步骤 (read-only)"文案
   - **sidebar 内容完全不变**（Light Anchor 决策——解耦验证）
3. 继续点 `<` → 更早的 step
4. 点 `>` 回到 latest → Continue 按钮重新可点

## 5. 历史 step 下仍可提问

1. 翻到 step 2 的历史视图
2. 在 sidebar 输入框提问："这一步的重点是什么"
3. **应看到**：
   - 消息发出去
   - 新消息的 disclosure 显示 "在 step N 时问的"——N 是**当前最新 step 号**（不是 displayed 的 step 2）
   - 原因：anchor 冻结在 latest，不是 displayed（Light Anchor 规则）

## 6. 多 step 并发 streaming（双 useChat 互不阻塞）

1. 在 canvas 上点 Continue，让 AI 流式生成下一步（约 3-5 秒窗口）
2. **streaming 中**同时在 sidebar 打字提问并发送
3. **应看到**：
   - canvas 和 sidebar 的 streaming **同时进行**
   - 两个都正常完成，互不阻塞、互不打断

## 7. 边缘场景：刷新页面后状态恢复

1. 中间提问完 N 条讨论后，**刷新页面**
2. **应看到**：
   - canvas 停在正确的 step（最新的）
   - sidebar 默认收起
   - 展开 sidebar → 之前的讨论全部还在（按时间线展开）
   - 每条 user message 的 anchor disclosure 小字仍正确

## 8. AI 不出 tool 的 fallback（可选，难以 deterministic 触发）

- 这个场景需要模型偶发出问题，难稳定复现
- 如真遇到 canvas 显示 "AI 没能生成下一步，请刷新或重试" 的卡片 → 点重试按钮能恢复，则验证通过

## 9. 生产脏数据清理（019bdc0c）

参见 `docs/incidents/2026-04-19-019bdc0c-orphan-cleanup.md`。

执行后：`/learn/019bdc0c-7200-740d-a379-c54608afc009` 从卡死骨架恢复为正常的 Socratic step。

## 问题排查

| 现象 | 可能原因 | 下一步 |
|------|---------|-------|
| sidebar 输入框 disabled | canvas 还没有任何 assistant message（没有 anchor 可冻结） | 正常——等 canvas 第一步生成后就能用 |
| 翻 canvas previous 时 sidebar 内容变了 | 回归 bug：anchor-driven UI 残留 | 查 `DiscussionSidebar` 的 props 是否误引用 `displayedStepIndex` |
| AI 答疑引用不到前面的讨论 | context 注入未生效 | 查 `/api/learn/discussion` 日志是否有 `chatHistoryMessageCount` > 0 |
| 提交 discussion 后 400 "Invalid anchor" | anchor 指向的不是 assistant 或已被软删 | 看 response body 的 `reason` 字段；对照 `AnchorValidationError` 枚举 |
| 多次开同一 learning 出现两条 chat conversation | advisory lock 失效 | `SELECT * FROM "LearningConversation" lc JOIN "Conversation" c ON lc."conversationId" = c.id WHERE lc."learningId" = 'xxx' AND c.kind = 'chat';` 看结果 |

## 验证完成后

记录问题 + 截图 + 录屏（任选）→ 让开发者决定是否 ship。

ship 路径：`feat/learning-experience` → PR → merge main → prod deploy（如 Vercel 自动触发）。
