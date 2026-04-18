## 1. 数据模型变更（Phase 1）

- [x] 1.1 在 `prisma/schema.prisma` 新增 `ConversationKind` 枚举（`canvas` | `chat`）
- [x] 1.2 给 `Conversation` model 新增 `kind ConversationKind @default(canvas)` 字段
- [x] 1.3 给 `Message` model 新增 `anchoredCanvasMessageId String?` 字段（自引用 FK + index）；anchor **仅作元数据**使用（Light Anchor 决策，详见 design.md §1）
- [x] 1.4 生成 migration `20260418161049_add_conversation_kind_and_anchor`，**已应用至本地 + 生产 supabase**（生产因 dotenv 加载顺序 bug 提前应用，已修 prisma.config.ts）
- [x] 1.5 更新 `docs/platform/database-data-dictionary.md`，登记 `kind` 与 `anchoredCanvasMessageId` 字段定义
- [x] 1.6 给 `lib/db/conversation.ts` 加 `getCanvasConversation(learningId, userId)` / `getOrCreateChatConversation(learningId, userId)` 方法（复用现有 conversation CRUD）
- [x] 1.6.1 `getOrCreateChatConversation` 防并发：事务内 `pg_advisory_xact_lock(hashtext(learningId || '|' || userId || '|chat'))` → SELECT 现有 → 没有则创建。verify 脚本验证两次连续调用返回同一 id
- [x] 1.6.2 修复 `lib/db/learning.ts:ensureLearningConversation` 加 `kind: "canvas"` 过滤（schema 加 kind 字段后的回归保护）
- [x] 1.7 新建 `lib/db/discussion.ts`：`getDiscussionMessages(chatConversationId)` / `createDiscussionMessage({ chatConversationId, anchorMessageId, role, parts, clientMessageId? })` / `assertValidAnchor`
- [x] 1.8 `createDiscussionMessage` 内置 anchor validator：校验 anchor 属于同 learning 的 canvas conversation 且 role=assistant 且 deletedAt IS NULL；不通过抛 `AnchorValidationError(reason)`，6 类违反 reason 全覆盖
- [x] 1.9 新建 `lib/chat/schemas.ts` 含共享 zod schema `discussionRequestBodySchema`（含 learningId / anchorMessageId / chatConversationId? / clientMessageId / input）；前后端共用
- [~] 1.10 **测试框架未在项目中搭建**——单测延后到 vitest bootstrap。替代方案：`scripts/verify-discussion-validator.ts` 用 NODE_OPTIONS='--conditions=react-server' + tsx 跑实际 DB 验证 9 个场景（含 anchor 6 类违反 + 懒创建 idempotent + happy path + getDiscussionMessages）。运行命令见脚本头注释

## 2. Discussion endpoint 与 prompt（Phase 1）

- [x] 2.1 新建 `lib/learn/prompts/discussion-system-prompt.ts`：含 negative example（"我已经为你点了下一题"）+ canvas step 地图 template
- [x] 2.2 新建 `app/api/learn/discussion/route.ts`：用 `discussionRequestBodySchema` 验证；注入 system prompt + 整段 discussion history；streamText 用空 tools 对象
- [x] 2.3 服务端把请求体携带的 `anchorMessageId` 写入 message 的 `anchoredCanvasMessageId`（信任客户端 freeze）
- [x] 2.4 服务端 onFinish 内 `prisma.$transaction` 原子写 user message + assistant response；isAborted=true 时直接 return 不写
- [~] 2.5 perf 日志的 `chatHistoryMessageCount` / `totalContextTokens` 暂未实现，留 task 9.x 验证后补
- [~] 2.6 单元测试同 1.10：测试框架未搭，已通过 verify-discussion-validator.ts 覆盖 anchor 写入；context 注入和无 tools 的验证留给 task 9.x 手动跑

## 3. ~~canvas tool-only 兜底与 abort 处理~~（Phase 2 已删除）

> **本组任务在 outside voice review 后被砍掉**。理由：pre-PMF 阶段，"canvas conversation 永远干净"是个纪律目标，不是技术目标——新架构下 chat 走另一个 endpoint，canvas endpoint 唯一的 trailing user 来源是 abort，桌面 + 稳定网络下一周不到一次。先靠 manual SQL 兜偶发的脏数据；真到高频再做 abort + retry 的状态机。
>
> 同时 outside voice 验证：现有 `/api/learn/chat` 已配 `toolChoice: "required"`（canvas-tool-redesign 完成），SDK 强制已经 80% 解决问题。剩下的 20%（模型偶尔违反）走前端 fallback 提示"AI 没有出题，请刷新重试"——零工程成本。
>
> 如果未来发现需要 abort + retry，参考 spike 验证：retry 必须放在 `createUIMessageStream({ execute })` 内部，**不能**放在 `streamText.onFinish`。

## 4. tRPC schema 与 getState 升级（Phase 2）

- [x] 4.1 `getState` 新增 `canvasConversationId`（必填）+ `chatConversationId`（可选，未懒创建时 null）；保留 `conversationId` 为 `canvasConversationId` 的别名以便前端渐进迁移
- [x] 4.2 `learning.getDiscussion`：输入 `{ learningId }`，返回 `{ chatConversationId, messages }`；未懒创建时返回 `{ chatConversationId: null, messages: [] }`
- [x] 4.3 同步更新 `getLearningStateLight` 的 select 加 `kind` 字段；zod 输入 schema 不变
- [~] 4.4 单元测试同 1.10 / 2.6：测试框架未搭，行为验证留 task 9.x 手动跑

## 5. 前端：删除 chat drawer，新增 discussion sidebar（Phase 3）

- [~] 5.1 feature flag 未加——决定不加：chat-drawer.tsx 直接删，回滚走 `git revert`。rationale：flag 只给旧 UI 续命，代码两份同步维护成本 > 回滚风险
- [x] 5.2 `components/learn/discussion-sidebar.tsx`：collapsible + 展开态内部 header/list/composer 布局
- [x] 5.3 `components/learn/discussion-message-list.tsx`：整段渲染 + 自动滚到底 + user 消息显示 anchor disclosure tag
- [x] 5.4 `components/learn/discussion-composer.tsx`：forwardRef + textarea + Enter 提交 + IME 兼容 + disabled 态
- [x] 5.5 `components/learn/use-discussion-chat.ts`：封装 useChat #2 + trpc.learning.getDiscussion 初始化 + anchor freeze 状态
- [x] 5.6 `learn-focus.tsx` 的 CanvasSession 导入 DiscussionSidebar；移除 drawer 相关 state + handleChatSend
- [x] 5.7 Cmd+/ / Ctrl+/ 快捷键：展开/收起 + 自动 focus textarea
- [~] 5.8 快捷键 audit：延后，上线实际体验后再看是否冲突（浏览器内 Cmd+/ 是"聚焦地址栏建议"但一般不触发）
- [x] 5.9 sidebar header = "AI 助教"（不绑定 canvas step）
- [x] 5.10 useChat id 用 `discussion:${learningId}` 合成，chatConversationId 通过 prepareSendMessagesRequest 从 getDiscussion query data 动态注入；未懒创建时前端传 undefined，由服务端 getOrCreateChatConversation 创建
- [x] 5.11 `git rm components/learn/chat-drawer.tsx`（toDisplayMessages 一并删除）
- [~] 5.12 React.memo 隔离未加——当前双 useChat 实例已天然独立，React 的 state 变化只影响包含它的组件树；真出现性能问题再加 memo

## 6. 前端：canvas previous 导航（Phase 3，与 sidebar 解耦）

- [x] 6.1 `components/learn/canvas-step-navigation.tsx`：左右翻页按钮 + 边缘圆形悬浮
- [x] 6.2 `LearningCanvas` 新增 isHistorical / onPrev / onNext props；历史态 + 非历史态分流渲染
- [x] 6.3 `CanvasSession` 维护 `displayedStepOverride` state（null = 跟随 latest，自动前进）
- [x] 6.4 isHistorical 时 A2UIRenderer 的 `onPendingChange` 传 undefined，widget 变只读
- [x] 6.5 历史 step 的 A2UI 组件本来就会根据 tool state=output-available 渲染已答高亮（canvas-tool-redesign 既有能力）；底部 Continue 按钮按 isHistorical 条件隐藏
- [x] 6.6 progress bar 按 displayedStepIndex 计算，历史浏览时 progress bar 会显示为对应位置
- [x] 6.7 sidebar 与 canvas 解耦：sidebar 组件不接收任何 displayed-step 相关的 prop（只接收 latestCanvasMessageId + anchorStepMap），翻 canvas previous 不触发 sidebar rerender

## 7. step 边界边界情况（Phase 3）

- [ ] 7.1 在 dev 模拟一次 multi-step round（让模型连续 emit 2 个 presentContent），验证前端正确渲染为 2 页 previous
- [ ] 7.2 添加测试覆盖：useChat messages 数组中连续多条 assistant message 的 step 计算与显示

## 8. 旧脏数据清理（Phase 4 - 简化为手写 SQL）

> **本组从工具化降级为一条 SQL**。理由：DB 中只有一条已知卡死会话（019bdc0c），写整套脚本是过度工程。规模上来后再用工具。

- [ ] 8.1 手写 SQL 软删除 019bdc0c 末尾的孤立 message [13][14]：
  ```sql
  UPDATE "Message"
  SET "deletedAt" = now()
  WHERE "conversationId" = '019bdc0c-8207-77ba-9914-44409c64c36f'
    AND id IN (SELECT id FROM "Message" WHERE ... ORDER BY "createdAt" DESC LIMIT 2);
  ```
  执行前先 SELECT 确认目标行；执行后刷新 019bdc0c 页面验证 canvas 能正常显示
- [ ] 8.2 在 `docs/incidents/` 建一个 `019bdc0c-cleanup.md` 记录这次清理的精确 SQL + 执行时间 + 验证结果，留作未来追溯
- [ ] 8.3 监控：一旦发现 DB 有第 2、3、4 条同类脏数据出现，再回头讨论"是否值得做工具化"

## 9. 验证与测试

- [ ] 9.1 启动 dev server，开新 learning 走完一个完整 step，确认 canvas 正常推进、sidebar 默认收起为窄条
- [ ] 9.2 展开 sidebar，提问"能给个例子吗"，确认回复落在 chat conversation、anchor 写入 latest canvas step id
- [ ] 9.3 翻 canvas previous，**确认 sidebar 内容不变**（解耦验证）
- [ ] 9.4 在历史 step 时提问，确认 anchor 仍是 latest（不是 displayed）
- [ ] 9.5 多 step 后再提问，确认 AI 能引用前面 step 的讨论（跨 step 上下文验证）
- [ ] 9.6 模拟 model 不调 tool（临时改 prompt 让它输出纯文本），确认前端 fallback 卡片渲染（"AI 没能生成下一步，重试吗"），点击重试能继续
- [ ] 9.7 执行 manual SQL 清理 019bdc0c（参见 task 8.1），刷新页面确认 canvas 能正常显示
- [ ] 9.8 关闭 feature flag 重新 build，确认旧 chat drawer 仍可工作（回滚演练）
- [ ] 9.9 双 useChat 并发测试：canvas 在 streaming 时点开 sidebar 提问，确认互不阻塞；反之亦然
- [ ] 9.10 lazy creation race 测试：模拟两个并发 discussion 请求同时来（同一 learning + user，无现有 chat conversation），确认 DB 中只创出一条 chat conversation（advisory lock 验证）
- [ ] 9.11 跨 step AI 引用 eval：脚本化跑 5 道连续学习 + 跨 step 引用提问；用 LLM-as-judge 评分 AI 回复是否准确接住"你之前说 X"类型的问题
- [ ] 9.12 anchor disclosure 验证：每条 user message 旁应显示"在 step N 时问的"小字
- [ ] 9.13 dangling anchor 验证：手动软删一条 canvas message，确认 anchor 指向它的 chat message 仍正常渲染（不报错），只是无 disclosure 显示

## 10. 文档与收尾

- [ ] 10.1 更新 `docs/learning/canvas-tool-design.md` 反映新架构（双 conversation、Light Anchor、sidebar、解耦的 previous 导航）
- [ ] 10.2 在 `docs/decisions/0003-canvas-chat-architecture.md` 末尾标注 "已实施" 与对应 commit
- [ ] 10.3 更新 README 的相关章节
- [ ] 10.4 PR description 链接 `docs/decisions/0002` 与 `0003` 作为决策上下文
- [ ] 10.5 准备用户测试步骤（中文，Step-by-step）：怎么验证 canvas 正常推进 / 怎么验证 sidebar / 怎么验证 previous 与 sidebar 的解耦 / 怎么验证恢复
