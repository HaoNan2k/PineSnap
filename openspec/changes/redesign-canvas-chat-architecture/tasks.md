## 1. 数据模型变更（Phase 1）

- [ ] 1.1 在 `prisma/schema.prisma` 新增 `ConversationKind` 枚举（`canvas` | `chat`）
- [ ] 1.2 给 `Conversation` model 新增 `kind ConversationKind @default(canvas)` 字段
- [ ] 1.3 给 `Message` model 新增 `anchoredCanvasMessageId String?` 字段（自引用 FK + index）；anchor **仅作元数据**使用（Light Anchor 决策，详见 design.md §1）
- [ ] 1.4 生成 migration（`prisma migrate dev --name canvas-chat-split`），dev 数据库验证 schema 正确
- [ ] 1.5 更新 `docs/platform/database-data-dictionary.md`，登记 `kind` 与 `anchoredCanvasMessageId` 字段定义
- [ ] 1.6 给 `lib/db/conversation.ts` 加 `getCanvasConversation(learningId)` / `getOrCreateChatConversation(learningId, userId)` 方法（**复用现有 conversation CRUD**，不在 discussion.ts 重复造）
- [ ] 1.6.1 `getOrCreateChatConversation` 防并发：用 `LearningConversation` 上 `(learningId, conversation.kind)` 唯一约束 + `ON CONFLICT DO NOTHING` + 重新 SELECT，确保两个并发请求只会创出一条 chat conversation
- [ ] 1.7 新建 `lib/db/discussion.ts`：仅放 discussion 特有逻辑——`getDiscussionMessages(chatConversationId)` / `createDiscussionMessage({ chatConversationId, anchorMessageId, role, content })` / 不重新实现 conversation CRUD
- [ ] 1.8 在 `createDiscussionMessage` 中实现 anchor 完整性 validator：校验 anchor message 属于同 learning 的 canvas conversation 且 role=assistant；不通过则抛错
- [ ] 1.9 在 `lib/chat/types.ts` 新加共享 zod schema `DiscussionRequestBody`（含 learningId / anchorMessageId / input）；前后端**都用同一个 schema 验**
- [ ] 1.10 编写单元测试覆盖：kind 隔离、anchor validator 三类违反场景（错 conversation、跨 learning、错 role）、懒创建、按 conversation 拉取整段

## 2. Discussion endpoint 与 prompt（Phase 1）

- [ ] 2.1 新建 `lib/learn/prompts/discussion-system-prompt.ts`：起草 prompt 文本；至少含 1 个 negative example（"我已经为你点了下一题"这种话不要说）；含 canvas history 摘要的 template hole
- [ ] 2.2 新建 `app/api/learn/discussion/route.ts`：接收 `DiscussionRequestBody`（用 1.9 的共享 schema）；校验、注入 context（**整段 chat history + canvas step 地图**）、调用 streamText（`tools: undefined`）
- [ ] 2.3 服务端把请求体携带的 `anchorMessageId` 写入 message 的 `anchoredCanvasMessageId`（**信任客户端 freeze 的 anchor，不重推断**）
- [ ] 2.4 服务端 onFinish 内原子写 user message + assistant response（用 `prisma.$transaction`）；abort 时不写
- [ ] 2.5 添加 perf 日志：每次 discussion 请求记录 `chatHistoryMessageCount` 与 `totalContextTokens` 估算
- [ ] 2.6 单元测试覆盖：context 注入正确（含整段 history）、不接受 tools、anchor 正确写入

## 3. canvas tool-only 兜底与 abort 处理（Phase 2）

- [ ] 3.1 在 `app/api/learn/chat/route.ts` 的 `toUIMessageStreamResponse` 配置 `consumeSseStream: consumeStream`（来自 `ai` 包）
- [ ] 3.2 抽出独立纯函数 `handleStreamFinish({ isAborted, response, ctx })`，三条路径（abort / no-tool retry / happy path）在内部分流；route handler 只调一次
- [ ] 3.3 abort 路径：软删除本轮已写入 user/tool message；不走任何持久化或 retry
- [ ] 3.4 happy path（非 abort）下检测 response.messages 是否含 tool call；无则触发一次性 retry
- [ ] 3.5 retry 仍失败 → 写入 fallback presentContent（错误提示文案）走 createMessage 流程
- [ ] 3.6 前端识别 abort response，展示"网络中断，请重试"提示并允许用户重新提交
- [ ] 3.7 添加日志：abort 次数、retry 触发次数、fallback 触发次数
- [ ] 3.8 单元测试覆盖 `handleStreamFinish` 三条路径：abort 路径不写、无 tool 路径触发 retry、happy path 正常写
- [ ] 3.9 给 streamText 调用配置 timeout 上限（建议 60s 与 maxDuration 对齐），防止 client 断开后 LLM 仍在烧 token 无限生成

## 4. tRPC schema 与 getState 升级（Phase 2）

- [ ] 4.1 修改 `server/routers/learning.ts` 的 `getState`：返回新增 `canvasConversationId`（必填）与 `chatConversationId`（可选，未懒创建时为 null）
- [ ] 4.2 新增 procedure `learning.getDiscussion`：输入 `{ learningId }`，返回该 learning 的 chat conversation 全段 messages（不按 step 过滤）
- [ ] 4.3 输入/输出 schema 更新对应的 zod 定义
- [ ] 4.4 单元测试 / e2e 验证 getState 与 getDiscussion 行为

## 5. 前端：删除 chat drawer，新增 discussion sidebar（Phase 3）

- [ ] 5.1 创建 feature flag `NEXT_PUBLIC_ENABLE_DISCUSSION_SIDEBAR`，默认 `true`，用作前端回滚开关（注意：只能回滚前端，不能回滚 schema/服务端变更）
- [ ] 5.2 新建 `components/learn/discussion-sidebar.tsx`：collapsible 容器（窄条 / 展开两态）、头部 / 滚动区 / 输入区、动画
- [ ] 5.3 新建 `components/learn/discussion-message-list.tsx`：渲染**整段** chat conversation 的 messages（不过滤）
- [ ] 5.4 新建 `components/learn/discussion-composer.tsx`：textarea + 发送按钮，回车提交，禁用态；提交时 freeze 当前 `latestCanvasStepId` 作为 anchor
- [ ] 5.5 新建 `components/learn/use-discussion-chat.ts` 自定义 hook：封装 useChat #2（discussion endpoint）+ sidebar 开关 state + composer 提交逻辑 + anchor freeze；`learn-focus.tsx` 仅 import 调用，不内嵌实现
- [ ] 5.6 在 `learn-focus.tsx` 组合 `useDiscussionChat` 与现有 canvas useChat；保持 learn-focus.tsx 短而清晰
- [ ] 5.7 添加键盘快捷键 `Cmd+/` / `Ctrl+/` 切换 sidebar 展开/收起；展开时自动 focus 输入框
- [ ] 5.8 实施前 audit `~/.claude/keybindings.json` 与 `next.config.ts` 等地方有无快捷键冲突
- [ ] 5.9 sidebar header 显示固定文案 "AI 助教"（**不绑定 canvas step**）
- [ ] 5.10 useChat #2 的 id 处理：第一次提交前 chatConversationId 为 null → 用 learning id 派生的合成 id 作为 fallback；首次响应通过 stream data part 回传真实 id；后续复用（沿用 chat-conversation spec 既有的 lazy creation 范式）
- [ ] 5.11 删除 `components/learn/chat-drawer.tsx` 与 `toDisplayMessages` helper（在 feature flag 下回滚保留路径，单独 commit 标记 deletion）
- [ ] 5.12 性能保护：discussion-sidebar 与 canvas useChat 状态 **不互相传 messages prop**，避免一边 streaming 时另一边无谓 re-render；用 React.memo 隔离

## 6. 前端：canvas previous 导航（Phase 3，与 sidebar 解耦）

- [ ] 6.1 新建 `components/learn/canvas-step-navigation.tsx`：左/右翻页按钮组件
- [ ] 6.2 在 `LearningCanvas` 集成 step navigation；接收 `currentStepIndex` / `totalSteps` / `onPrev` / `onNext` props
- [ ] 6.3 `CanvasSession` 维护 `displayedStepIndex` state；翻页操作改这个 state，不影响真实 message 流
- [ ] 6.4 当 `displayedStepIndex !== latestStepIndex` 时，A2UIRenderer 接收 `isReadOnly: true` prop
- [ ] 6.5 历史 step 的 quiz / Socratic 渲染：高亮用户当时答案，禁止再选，隐藏 Continue
- [ ] 6.6 progress bar 同步显示 `displayedStepIndex`（不丢失"当前是历史回看"的视觉提示）
- [ ] 6.7 验证 sidebar **不**随 displayedStepIndex 变化（与 canvas 解耦的回归测试）

## 7. step 边界边界情况（Phase 3）

- [ ] 7.1 在 dev 模拟一次 multi-step round（让模型连续 emit 2 个 presentContent），验证前端正确渲染为 2 页 previous
- [ ] 7.2 添加测试覆盖：useChat messages 数组中连续多条 assistant message 的 step 计算与显示

## 8. 旧脏数据清理（Phase 4）

- [ ] 8.1 实现 `scripts/cleanup-orphan-conversations.ts`：扫描所有 `kind=canvas` Conversation，从尾向前清理连续 user/tool message 链
- [ ] 8.2 dry-run 模式：仅输出 report 不写库；report 写到 `scripts/cleanup-report-{timestamp}.json`
- [ ] 8.3 执行模式：软删除（设 `deletedAt`），并写 audit log
- [ ] 8.4 单元测试覆盖：正常会话不动、单条孤立、user+tool 双尾、streak（4 条）、019bdc0c 实际形态
- [ ] 8.5 `package.json` 加 `pnpm cleanup:orphan-conversations` 与 `pnpm cleanup:orphan-conversations -- --dry-run` 命令
- [ ] 8.6 cleanup 脚本支持 batch 处理（默认每批 200 条 conversation）+ 进度日志，避免一次性吃光 DB connection 或内存
- [ ] 8.7 cleanup 扫描时**仅遍历有 deletedAt IS NULL message 的活跃 conversation**，跳过已全部软删的

## 9. 验证与测试

- [ ] 9.1 启动 dev server，开新 learning 走完一个完整 step，确认 canvas 正常推进、sidebar 默认收起为窄条
- [ ] 9.2 展开 sidebar，提问"能给个例子吗"，确认回复落在 chat conversation、anchor 写入 latest canvas step id
- [ ] 9.3 翻 canvas previous，**确认 sidebar 内容不变**（解耦验证）
- [ ] 9.4 在历史 step 时提问，确认 anchor 仍是 latest（不是 displayed）
- [ ] 9.5 多 step 后再提问，确认 AI 能引用前面 step 的讨论（跨 step 上下文验证）
- [ ] 9.6 模拟 stream abort（dev tools 断网），确认 user message 被回滚、UI 显示重试提示
- [ ] 9.7 模拟 model 不调 tool（临时改 prompt 让它输出纯文本），确认 retry 触发；连续两次失败时 fallback presentContent 出现
- [ ] 9.8 跑 cleanup 脚本 dry-run，确认 019bdc0c 在 report 里
- [ ] 9.9 跑 cleanup 脚本实际执行，刷新 019bdc0c 页面，确认 canvas 能正常显示并支持继续学习
- [ ] 9.10 关闭 feature flag 重新 build，确认旧 chat drawer 仍可工作（回滚演练）
- [ ] 9.11 双 useChat 并发测试：canvas 在 streaming 时点开 sidebar 提问，确认互不阻塞；反之亦然
- [ ] 9.12 lazy creation race 测试：模拟两个并发 discussion 请求同时来（同一 learning，无现有 chat conversation），确认 DB 中只创出一条 chat conversation（要么 unique constraint 兜底、要么 advisory lock）
- [ ] 9.13 跨 step AI 引用 eval：脚本化跑 5 道连续学习 + 跨 step 引用提问；用 LLM-as-judge 评分 AI 回复是否准确接住"你之前说 X"类型的问题（参考 chat-storage 的 eval pattern，如有）

## 10. 文档与收尾

- [ ] 10.1 更新 `docs/learning/canvas-tool-design.md` 反映新架构（双 conversation、Light Anchor、sidebar、解耦的 previous 导航）
- [ ] 10.2 在 `docs/decisions/0003-canvas-chat-architecture.md` 末尾标注 "已实施" 与对应 commit
- [ ] 10.3 更新 README 的相关章节
- [ ] 10.4 PR description 链接 `docs/decisions/0002` 与 `0003` 作为决策上下文
- [ ] 10.5 准备用户测试步骤（中文，Step-by-step）：怎么验证 canvas 正常推进 / 怎么验证 sidebar / 怎么验证 previous 与 sidebar 的解耦 / 怎么验证恢复
