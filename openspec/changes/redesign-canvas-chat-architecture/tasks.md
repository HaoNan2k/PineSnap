## 1. 数据模型变更（Phase 1）

- [ ] 1.1 在 `prisma/schema.prisma` 新增 `ConversationKind` 枚举（`canvas` | `chat`）
- [ ] 1.2 给 `Conversation` model 新增 `kind ConversationKind @default(canvas)` 字段
- [ ] 1.3 给 `Message` model 新增 `anchoredCanvasMessageId String?` 字段，含自引用关系 `anchoredCanvasMessage` / `anchoredChats`，并加 index
- [ ] 1.4 生成 migration（`prisma migrate dev --name canvas-chat-split`），dev 数据库验证 schema 正确
- [ ] 1.5 更新 `docs/platform/database-data-dictionary.md`，登记 `kind` 与 `anchoredCanvasMessageId` 字段定义
- [ ] 1.6 给 `lib/db/conversation.ts` 加 `getCanvasConversation(learningId)` / `getOrCreateChatConversation(learningId, userId)` 方法
- [ ] 1.7 新建 `lib/db/discussion.ts`：`getDiscussionByAnchor(canvasMessageId)` / `createDiscussionMessage(...)` / `listDiscussionsForLearning(learningId)`
- [ ] 1.8 编写单元测试覆盖新方法（kind 隔离、anchor 查询、懒创建）

## 2. Discussion endpoint 与 prompt（Phase 1）

- [ ] 2.1 新建 `lib/learn/prompts/discussion-system-prompt.ts`，定义 discussion AI 的 system prompt（角色定位、不可调 tool、不影响 canvas）
- [ ] 2.2 新建 `app/api/learn/discussion/route.ts`：接收 `{ learningId, canvasMessageId, input }`，校验、注入 context（当前 step + canvas history 摘要 + 锚定 chat history）、调用 streamText（`tools: undefined`）
- [ ] 2.3 服务端在写入 chat message 时自动设 `anchoredCanvasMessageId`
- [ ] 2.4 服务端 onFinish 内原子写 user message + assistant response（参考 0002 关于 onFinish 与 abort 的限制）
- [ ] 2.5 单元测试覆盖：context 注入正确、不接受 tools、message 正确锚定

## 3. canvas tool-only 兜底与 abort 处理（Phase 2）

- [ ] 3.1 在 `app/api/learn/chat/route.ts` 的 `toUIMessageStreamResponse` 配置 `consumeSseStream: consumeStream`（来自 `ai` 包）
- [ ] 3.2 onFinish 接收 `isAborted` 参数；为 true 时跳过所有 message 持久化，并软删除本轮已写入的 user/tool message
- [ ] 3.3 onFinish 检测 response.messages 中是否包含至少一个 tool call；无则触发 retry（最多 1 次）
- [ ] 3.4 retry 仍失败 → 写入 fallback presentContent（错误提示文案），仍走原 createMessage 流程
- [ ] 3.5 前端识别 abort response 与 fallback presentContent，对前者展示重试提示
- [ ] 3.6 添加日志：abort 次数、retry 触发次数、fallback 触发次数（perf log 风格）

## 4. tRPC schema 与 getState 升级（Phase 2）

- [ ] 4.1 修改 `server/routers/learning.ts` 的 `getState`：返回新增 `canvasConversationId`（必填）与 `chatConversationId`（可选）
- [ ] 4.2 新增 procedure `learning.getDiscussion`：输入 `{ learningId, canvasMessageId }`，返回该 step 锚定的所有 chat messages
- [ ] 4.3 输入/输出 schema 更新对应的 zod 定义
- [ ] 4.4 单元测试 / e2e 验证 getState 与 getDiscussion 行为

## 5. 前端：删除 chat drawer，新增 discussion sidebar（Phase 3）

- [ ] 5.1 创建 feature flag `NEXT_PUBLIC_ENABLE_DISCUSSION_SIDEBAR`，默认 `true`，用作回滚开关
- [ ] 5.2 新建 `components/learn/discussion-sidebar.tsx`：collapsible 容器（窄条 / 展开两态）、头部 / 滚动区 / 输入区、动画
- [ ] 5.3 新建 `components/learn/discussion-message-list.tsx`：渲染锚定到当前 step 的 chat messages
- [ ] 5.4 新建 `components/learn/discussion-composer.tsx`：textarea + 发送按钮，回车提交，禁用态
- [ ] 5.5 在 `components/learn/learn-focus.tsx` 中增加第二个 useChat 实例（针对 discussion endpoint），管理 sidebar state（开关、当前 anchor、提交回调）
- [ ] 5.6 添加键盘快捷键 `Cmd+/` / `Ctrl+/` 切换 sidebar 展开/收起，展开时 focus 输入框
- [ ] 5.7 删除 `components/learn/chat-drawer.tsx` 与 `toDisplayMessages` helper（在 feature flag 下回滚保留路径，单独 commit 标记 deletion）
- [ ] 5.8 sidebar header 显示 "关于「current step 标题」"——title 派生自 canvas 当前 step 的 tool input（quiz question 等）

## 6. 前端：canvas previous 导航（Phase 3）

- [ ] 6.1 新建 `components/learn/canvas-step-navigation.tsx`：左/右翻页按钮组件
- [ ] 6.2 在 `LearningCanvas` 集成 step navigation；接收 `currentStepIndex` / `totalSteps` / `onPrev` / `onNext` props
- [ ] 6.3 `CanvasSession` 维护 `displayedStepIndex` state；翻页操作改这个 state，不影响真实 message 流
- [ ] 6.4 当 `displayedStepIndex !== latestStepIndex` 时，A2UIRenderer 接收 `isReadOnly: true` prop
- [ ] 6.5 历史 step 的 quiz / Socratic 渲染：高亮用户当时答案，禁止再选，隐藏 Continue
- [ ] 6.6 progress bar 同步显示 `displayedStepIndex`（不丢失"当前是历史回看"的视觉提示）
- [ ] 6.7 sidebar 接收 `displayedStepIndex` 对应的 anchor，`getDiscussion` 拉取讨论历史

## 7. 旧脏数据清理（Phase 4）

- [ ] 7.1 实现 `scripts/cleanup-orphan-conversations.ts`：扫描所有 `kind=canvas` Conversation，识别末尾孤立 user/tool message
- [ ] 7.2 dry-run 模式：仅输出 report 不写库；report 写到 `scripts/cleanup-report-{timestamp}.json`
- [ ] 7.3 执行模式：软删除（设 `deletedAt`），并写 audit log
- [ ] 7.4 单独清理脚本验证 019bdc0c 这条会话能被识别 + 能在执行后正常打开
- [ ] 7.5 `package.json` 加 `pnpm cleanup:orphan-conversations` 与 `pnpm cleanup:orphan-conversations -- --dry-run` 命令

## 8. 验证与测试

- [ ] 8.1 启动 dev server，开新 learning 走完一个完整 step，确认 canvas 正常推进、sidebar 默认收起
- [ ] 8.2 展开 sidebar，提问"能给个例子吗"，确认回复落在 chat conversation、anchor 到当前 step
- [ ] 8.3 翻 previous，确认 sidebar 内容自动切换为对应 step 锚定的 chat history
- [ ] 8.4 模拟 stream abort（在 dev tools 断开网络），确认 user message 被回滚、UI 显示重试提示
- [ ] 8.5 模拟 model 不调 tool（临时改 prompt），确认 fallback 触发
- [ ] 8.6 跑 cleanup 脚本 dry-run，确认 019bdc0c 在 report 里
- [ ] 8.7 跑 cleanup 脚本实际执行，刷新 019bdc0c 页面，确认 canvas 能正常显示并支持继续学习
- [ ] 8.8 关闭 feature flag 重新 build，确认旧 chat drawer 仍可工作（回滚演练）

## 9. 文档与收尾

- [ ] 9.1 更新 `docs/learning/canvas-tool-design.md` 反映新架构（双 conversation、anchoring、sidebar）
- [ ] 9.2 在 `docs/decisions/0003-canvas-chat-architecture.md` 末尾标注 "已实施" 与对应 commit
- [ ] 9.3 更新 README 的相关章节
- [ ] 9.4 PR description 链接 `docs/decisions/0002` 与 `0003` 作为决策上下文
- [ ] 9.5 准备用户测试步骤（中文，Step-by-step）：怎么验证 canvas 正常推进 / 怎么验证 sidebar / 怎么验证 previous / 怎么验证恢复
