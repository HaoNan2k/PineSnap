# 0002 · Canvas 学习会话的中断恢复策略

> 状态：**调研完成、决策待定**
> 日期：2026-04-17 开始 / 2026-04-18 沉淀
> 分支：feat/learning-experience
> 涉及文件：`app/api/learn/chat/route.ts`、`server/routers/learning.ts`、`components/learn/learn-focus.tsx`、`components/learn/learning-canvas.tsx`

## 写这份文档的目的

这份文档是一次**产品 + 架构联合决策**的全程记录。

它不是事后总结。是把当时的对话、走过的弯路、被推翻的方案、外部证据、第三方独立意见**全量保留**，因为：

1. 这个决策本身的结论可能会被未来的产品方向推翻，但**思考过程的证据链**（学习科学、AI SDK 的实际行为、各产品形态的对比）在更长时间里仍然有效
2. PineSnap 是 canvas-led 产品，这个决策定义了"canvas 在出错时该长什么样"——是这个产品的**根 UX 契约之一**
3. 未来任何人想动 `/api/learn/chat` 持久化逻辑、想加 retry 按钮、想做"学习历史回看"功能时，都应该回头读这份文档，知道当时的判据

文档**结构上不追求简洁**，追求"未来读到的人能看见全部当时的信息"。

---

## 1. Bug 现场

### 1.1 用户报告

`http://localhost:3000/learn/019bdc0c-7200-740d-a379-c54608afc009` 进入后页面"卡死"——canvas 区域只显示灰色骨架屏（4 条灰色横条 + 1 块大灰块），Continue 按钮 disabled，Chat 抽屉关闭。

### 1.2 表面调查

第一轮调查走错了方向。最初怀疑是浏览器主线程被 React 渲染循环阻塞，因为 Claude in Chrome 扩展在导航后立即断连。

第二轮 `rm -rf .next && pnpm dev` 重启 dev server，触发了一个 Next.js 16.0.8 + Turbopack 的 chunk path bug：`.next/dev/server/pages/_document.js` require 了一条不存在的路径 `../chunks/ssr/[turbopack]_runtime.js`（实际位置是 `../chunks/[turbopack]_runtime.js`，没有 `ssr/` 子目录）。

这个 chunk path bug 在 Next.js 16.2.4 修复，**不是本次主题**。详见 commit history 的 next 版本升级。

### 1.3 真实根因

数据库层面：

```
对话 019bdc0c-8207-... 有 15 条消息：
  [0..12] 正常的 user/assistant/tool 交替
  [11] role=assistant parts=[tool-call(renderSocraticBranch)]
  [12] role=tool      parts=[tool-result(renderSocraticBranch)]    ← user 答了 socratic
  [13] role=assistant parts=[text(58c)]                              ← assistant text 追问
  [14] role=user      parts=[text(8c)] cmi=drgWvzqBy78JZPi7         ← user text 回答
  [无 [15] assistant]
```

最后一条是用户的 8 字回答，assistant 的下一步**从未生成或落库**。

前端 `components/learn/learn-focus.tsx:313-316`：

```tsx
const currentToolInvocations = useMemo(() => {
  if (!lastMessage || lastMessage.role !== "assistant") return [];
  return getToolInvocationsFromLastStep(lastMessage.parts);
}, [lastMessage]);
```

末尾是 user → 返回空 → `hasTools=false` → 渲染 `<CanvasSkeleton />`，永远停留在骨架屏。

### 1.4 直接成因（"卡死会话工厂"）

`app/api/learn/chat/route.ts:136-140`：

```ts
// 2. Persist User/Tool Message
const hasToolResult = input.some((p) => p.type === "tool-result");
const messageRole = hasToolResult ? Role.tool : Role.user;

await createMessage(conversationId, messageRole, input, clientMessageId);
await touchConversation(conversationId, userId);
```

**用户消息在调用 LLM 之前就立即落库**。然后 `streamText` 启动（line 184），assistant 消息只在 `onFinish` 里通过 `waitUntil` 异步落库（line 194-217）。

任何中间环节失败：
- LLM provider 报错
- Stream 被网络中断
- Vercel serverless 超时
- 用户关 tab 触发 abort signal
- Next.js dev HMR 重启服务器

→ user 消息**已在 DB**，assistant 消息**未在 DB** → 卡死会话产生。

每一次 LLM 闪失都会再造一条卡死。这个 bug 是个**生产卡死会话的工厂**。

---

## 2. 思考的全过程（四次转向）

我（Claude orchestrator）在和产品负责人讨论中走了**四次**思路转弯。每次都被推翻。完整记录如下。

### 2.1 第一次：技术层面的四层框架（被推翻）

最早提出了一个"四层弹性架构"框架：

| 层 | 做什么 | 工程量 |
|---|------|-------|
| L1 服务端原子写（C） | onFinish 里事务写 user + assistant | 小 |
| L2 服务端读取清理（A） | getState 过滤孤立 user | 小 |
| L3 本地 draft | IndexedDB 存 pending 答案 | 中 |
| L4 全离线 | service worker + queue | 大 |

并推荐 L1 + L2 的组合。

**用户的反驳**：

> "你太在意技术上的事情？我认为应该先从用户体验出发去考虑这件事情，认真思考用户在操作页面的时候会想什么，这才是最主要的。"

这个反馈是对的。L1/L2/L3/L4 是系统架构师的分解，**起点错了**——应该从"用户在这个页面会想什么"开始，再往技术下沉。

### 2.2 第二次：UX-first 的"步是原子的"框架（部分错）

被纠正后的重新思考：

**学习者的认知单位是"一个知识点"，不是"一条消息"**。三天后回来的小李不会想"我答到第 14 条消息了"，他会想"我上次学到哪了"。

参考主流学习 app：
- Duolingo：中途退出 → 回来不是恢复半轮，而是显示课程菜单让"重新进入"
- Khan Academy：互动题中途退出 → 题重置
- Anki：卡片答到一半不算答

**共同点：学习 app 里"步"是原子的**。完成 = 呈现 + 回答 + 反馈三件事**全齐**才算。

提了三个 UX 候选：
- **α**：回到上次那道 Socratic 题，重新可答，无错误提示
- **β**：显示章节目录视图，让用户自选从哪继续
- **γ**：α + canvas 顶部一行小字"继续学习 Supabase · 上次学到 RLS"

技术上对应 C（事务写）+ A（读取过滤）。

### 2.3 第三次：被独立 sub-agent 1 打脸 → 转向 C + δ

用户要求多调研、找第二意见。我派出第一个独立 sub-agent，给了它前面的全部讨论上下文，让它质疑我的框架。

**Sub-agent 1 的核心打击 1**：drill ≠ generative。

> "'步是原子的'在 Duolingo/Anki 这种 drill 型应用是对的，因为它们的'步'本身没有上下文累积——下一题和上一题独立。但 PineSnap 不是 drill，是 AI 生成的学习路径。第 7 步的内容**依赖**用户在第 6 步说了什么。'能'这个回答不是一个可丢弃的中间态，它是下一步生成的输入。"

它给的反例：Replit/Cursor 的 AI 对话、ChatGPT 的 regenerate、Notion AI、Synthesis、Speak（AI 口语）、AI Dungeon、NovelAI——**都保留 orphan user message**。

**Sub-agent 1 的核心打击 2**：α/β/γ 三个候选**全部假设服务端无能为力**。少了候选 δ。

> "δ：检测到 trailing user message + 无 assistant 回复时，**懒触发一次重新生成**（用户点开 URL 的瞬间，后台重跑那次 AI 调用）。他看到'正在继续上次的学习…' 1-2 秒后 assistant 接住。这才是 Gmail 草稿、iOS Mail 离线队列、GitHub Actions 失败重试的范式——**不是让用户重做，是让系统把没做完的事做完**。"

**Sub-agent 1 的关键补充**：即使做 δ，AI 恢复后第一句要带回顾。

> "你上次说 RLS 限制的是'能查到哪些行'——对的。接下来…"

理由：用户三天后早就忘了自己答了啥。机械恢复"上次的"对话，对他来说还是断的。让 AI 自己嚼一下上下文再继续，比任何 UX 框架都管用。

**Sub-agent 1 的最终建议**：
- P0 写入事务化（半天）
- P1 检测 orphan 时懒重生成 + 兜底（1 天）
- 不做 α/β/γ
- outline view 留给成熟期

我接受了它的论点，更新到 **C + δ** 方案。

### 2.4 第四次：被两个新 sub-agent 同时打脸 → 极简 4 小时方案

用户进一步要求："给 2 个 sub agent 聊聊你们两个 agent 的看法，让它们分别评价"。我派出两个新的独立 sub-agent，**分别给它们看完整的辩论**（我的原框架 + sub-agent 1 的反击 + 我的更新结论），让它们独立评判。

两个 agent 用不同的视角切入：
- **Sub-agent A**：资深学习产品设计师（B 轮学习公司 8 年经验），UX 和学习科学视角
- **Sub-agent B**：实用主义早期创业 CTO，工程权衡和"能落地"视角

它们的关键发现详见第 3 节"独立专家意见"，这里只列**收敛结论**：

| | Sub-agent A（设计师） | Sub-agent B（CTO） |
|--|---|---|
| δ 懒重生成 | **不做** | **不做** |
| α 让用户重答 | **做**（testing effect 是学习收益） | **做**（manual retry button） |
| 大重构 | **不做**（pre-PMF） | **不做**（机会成本） |
| 工程上限 | 1-2 天 | **4 小时** |

它们对我的评价：
- 设计师 agent："1 号被 2 号带偏了。2 号论证漂亮但忽略了学习科学和成本结构。**真正该做的是 C + α + γ，不是 C + δ**。"
- CTO agent："1 号助手的工程直觉对（C 比 α 干净），但产品判断错（pre-PMF 不该花 2 天修边缘 case）。2 号助手的 δ 是典型的 AI 助手失控——给一个简单问题加了三层基建。**两个都不及格。**"

更要命的是，CTO agent 抛出一个**技术事实炸弹**，说我和 sub-agent 1 都搞错了 onFinish 的行为。后续的官方文档调研（详见第 4 节）证实它**100% 是对的**。

### 2.5 第四次反思后：用户提出的新方向

用户在最新一轮提出了一个**比所有 AI agent 都好的方案**：

> "如果 getstate 过滤孤立尾巴，那么用户如果重新上传答案，是不是要修改这次的 user message 呢？如果不过滤孤立的 user message，那么是不是也可以渲染到页面上，用户可以看到上次选了什么？"

这个想法等于 **δ 但用户主动触发**：
- 服务端不过滤孤立 user message
- 前端检测到末尾是 user 时，**渲染 user 上次的选择**（如果是 tool 答案，pre-fill 那个 quiz；如果是 text 答案，显示一张轻量"对话续接"卡片）
- 提供 Continue 按钮，点击才触发 AI 生成

优点：
- 不烧 token 在用户随手刷页面这种行为上
- 没有 loading 提示泄露 bug
- 用户**控制权完整**——可以继续、可以改、可以走
- 不损失 testing effect（用户想改答案随时可以改）

这是**一个独立人类用户基于产品直觉做出的判断**，比所有 AI agent 的 α/β/γ/δ 框架都更细腻。这个方向值得作为最终决策的种子。

---

## 3. 独立专家意见（全量记录）

### 3.1 Sub-agent 1 的完整 prompt

> "你是一个独立的产品设计顾问。不要读任何本仓库代码。这个问题不需要看源码，是个纯产品思考题。
>
> ## 场景
>
> PineSnap 是一个 canvas-led 的 AI 学习应用。不是聊天应用。用户来这里**学东西**（例如 Supabase 的 RLS 安全概念），主界面是一个 canvas，canvas 每一步呈现一个 tool：
> - 多选题（MultipleChoiceQuiz）
> - 单选题（SingleChoiceQuiz）
> - Socratic 二选一问答（能/不能、是/否）
> - 填空题（FillInBlank）
> - 内容页（PresentContent）
>
> Chat 抽屉是一个**次要**入口，藏在屏幕右边，默认关闭。用户的"学习"发生在 canvas，不是 chat。
>
> ## 出的问题
>
> 一个真实用户 "小李" 三天前学到一道 Socratic 问题："RLS 到底'限制的对象'是什么？（能/不能）"。他答了"能"。答案发给服务端后、assistant 的下一步生成之前，网络中断了（或 tab 关了、或 serverless 超时）。结果：
> - 他的 user 消息（"能"）进了 DB
> - assistant 的回复没进 DB
> - 他的会话末尾留下了一条**孤立的用户答案**
>
> 今天他重新点进同一个 URL。canvas 现在显示的是**一片灰色骨架屏**，什么内容都没有，Continue 按钮 disabled。他一脸懵。
>
> ## 我（另一个 AI 助手）在和产品负责人讨论怎么解。我的初步结论是
>
> **核心 insight**: 这不是一个'技术恢复'问题，是'认知连续性'问题。学习者的认知单位是'一个知识点'或'一道题'，不是'一条消息'。主流学习 app（Duolingo、Khan Academy、Anki）都**不保存'答到一半'的中间状态**——每一步都是原子的：呈现 + 回答 + 反馈三件事全齐才算完成；任何一件没齐就视为没发生，下次回来从最近完整步继续。
>
> 我据此提出三个 UX 候选：
>
> **候选 α — 回到最近完整步的开头**
> 用户看到的是上次那道 Socratic 问题，重新可答。没有错误提示、没有恢复卡、不告诉他'你上次答了能'。就像他刚读完题，准备答。
>
> **候选 β — 章节目录视图**
> 不直接落在某一步，而是显示'你学到哪了'的大纲视图：已完成 6 步 ✓，当前在 RLS 节。让他自己选从哪继续。
>
> **候选 γ — α + 欢迎回来标签**
> α 的内容 + canvas 顶上一行小字'继续学习 Supabase · 上次学到 RLS'。让他 orient，但不强迫选择。
>
> ## 我要你做的事
>
> **不要赞同我。专门挑我没想到的。** [略，详见对话记录]"

### 3.2 Sub-agent 1 的完整回复

> # 反驳与补充
>
> ## 1. 你的 insight 半对，但藏了一个偷换
>
> "步是原子的"在 **Duolingo/Anki 这种 drill 型应用** 是对的，因为它们的"步"本身没有上下文累积——下一题和上一题独立。但 PineSnap 不是 drill，是 **AI 生成的学习路径**。这意味着第 7 步的内容**依赖**用户在第 6 步说了什么。"能"这个回答不是一个可丢弃的中间态，它是**下一步生成的输入**。你把它当成"中间态"丢掉，等于让 AI 重新猜小李在想什么——而 AI 这次未必生成同一道题。
>
> 反例更关键：**Replit/Cursor 的 AI 对话、ChatGPT 的 regenerate、Notion AI** 都保留 orphan user message，因为"用户的输入"是创作行为，不是 drill 的一次尝试。学习类的 **Synthesis、Speak（AI 口语）** 也都保留半轮对话。
>
> 所以你的 framing 错位：你在用 drill 的原子性，套一个 generative tutor 的产品。
>
> ## 2. 你的三个候选漏了真正应该做的那个
>
> α/β/γ 都是 **"前端怎么显示"** 的方案，全都假设服务端无能为力。真正缺的候选是：
>
> **候选 δ — 服务端补救**：检测到 trailing user message + 无 assistant 回复时，**懒触发一次重新生成**（在他点开 URL 的瞬间，后台重跑那次 AI 调用）。他看到的是"正在继续上次的学习…" 1-2 秒后就出现了 assistant 的回复。**这才是 Gmail 草稿、iOS Mail 离线队列、GitHub Actions 失败重试的范式**——不是让用户重做，是让系统把没做完的事做完。
>
> α 的问题是**让用户重答**——他三天前就答过了，再答一次是惩罚，不是连续性。β 的问题是**目录视图打断了沉浸**——学习 app 最怕的就是让人"选择从哪开始"，因为选择就是流失点（Headspace 早期就因为太多入口选择而流失严重，后来收敛到"今天的冥想"单卡片）。γ 只是在 α 的伤口上贴了张创可贴。
>
> ## 3. 你没参考的产品
>
> - **Linear 的 optimistic UI + 后台同步**：操作发出去就显示成功，失败了静默重试，用户根本不知道有过失败。
> - **Figma 的 multiplayer recovery**：断线重连后自动 replay 你的操作，不弹窗、不打断。
> - **AI Dungeon / NovelAI**：生成中断时给一个"继续生成"按钮，**保留上下文**让 AI 接着写。这个最像 PineSnap。
> - **Loom 的录制中断**：本地有 buffer，重连后 merge，never lose work。
> - **Cursor 的 chat**：assistant 回复中断后，user 消息**保留**，旁边一个 retry 图标。
>
> 共同点：**没有一个让用户重做。** 你的 α 让用户重做。
>
> ## 4. 你的盲点
>
> 最大盲点：你把这个当成 **"恢复 UX 问题"**，但它真正暴露的是 **写入路径不是事务性的**。user message 和 assistant message 应该在**同一个事务里**要么都成功要么都失败（或者用 saga + compensating action）。修了这个，三天后小李回来时根本不会有 orphan message。
>
> 你在 UX 层精雕细琢三个候选，是在**给一个架构 bug 化妆**。
>
> 第二个盲点：你假设小李记得三天前学了什么。**他不记得**。无论 α/β/γ，他都需要 re-orientation。所以即使做 δ，也要在恢复后的 assistant 回复里**先简短回顾**："你上次说 RLS 限制的是'能查到哪些行'——对的。接下来我们看…" 这一句比任何 UX 框架都管用。
>
> ## 5. 对 PineSnap 当前阶段的建议
>
> pre-PMF + 有限预算下，**别做 α/β/γ**。做这两件，按顺序：
>
> | 优先级 | 做什么 | 工作量 | 价值 |
> |---|---|---|---|
> | P0 | 写入事务化：user msg + assistant msg 用 Supabase transaction 或 outbox pattern | 半天 | 根除 orphan，未来不再有这类 bug |
> | P1 | 检测到 orphan 时，进入页面自动后台 retry 那次 AI 调用（候选 δ），失败再 fallback 到 α | 1 天 | 用户无感恢复 |
>
> β 和章节目录视图是**成熟期产品**才该做的（用户已经学了 50 个知识点、需要导航）。pre-PMF 阶段做目录是过度设计——你都还不知道用户会不会回来第二次。
>
> 一句话：**先修管道，再谈 UX**。

### 3.3 Sub-agent A（设计师）的完整 prompt

[完整 prompt 见对话记录，要点：扮演 B 轮学习公司 8 年的资深产品设计师，独立第三方裁判，给前两个 agent 的辩论评判，挑他们都没想到的盲点，给自己的建议。]

### 3.4 Sub-agent A（设计师）的完整回复

> # 第三方裁判判断
>
> ## 1. drill vs generative 的区分：基本站得住，但 2 号说太满了
>
> 这个区分**方向正确，颗粒度不够**。Duolingo 的"步"确实可以原子丢弃，因为它的下一题不依赖你上一题怎么答的——题库是预生成的。PineSnap 的"步"依赖前文，这点 2 号说对了。
>
> 但 2 号忽略了一件事：**Socratic 二选一这种题，它的"生成依赖"其实非常弱**。"能/不能"两个分支的下一步，作者完全可以预先设计——这本质上是**伪 generative，真 branching**。真正强 generative 依赖的是"用户用自己的话解释 RLS"这种开放回答。如果 PineSnap 的题型大多是单选/二选/填空，那它在数据结构上**比 2 号说的更接近 drill**，δ 方案的必要性就被高估了。
>
> 所以更准确的说法是：**PineSnap 是 drill 的骨架 + generative 的肌肉**。判断该不该 δ，要看具体题型的生成依赖强度，不能一刀切。
>
> ## 2. α 不是惩罚，2 号在这点上判断错了
>
> 学习科学上有个非常硬的概念叫 **testing effect / retrieval practice**——主动从记忆中提取答案，比被动看一遍续写，长期记忆留存率高 50% 以上（Roediger & Karpicke 2006 的经典实验）。三天的间隔正好踩在 **spacing effect** 的甜区。
>
> 换句话说：**让小李重新答一次"能/不能"，从学习效果上是赚的，不是亏的**。2 号把"重答"等同于"惩罚"，是把游戏化 app（Duolingo 连胜断了那种挫败感）的直觉错误迁移到学习场景。
>
> α 真正的问题不是"惩罚"，是**没有上下文衔接感**——用户不知道自己为什么又看到这道题。但这个问题用 γ 那行小字就能解决：「上次答到这里，再确认一下」。
>
> ## 3. δ 的产品代价 1 号确实没想透
>
> 三个真实代价：
>
> | 代价 | 严重度 | 1 号有想吗 |
> |---|---|---|
> | 每次回看烧 token + 等 1-2s | 高 | 没想 |
> | "正在继续..." 把 bug 变成 feature | 高 | 没想 |
> | 失败重试的状态机复杂度 | 中 | 提了但轻描淡写 |
>
> 第一条最致命。**学习行为里"反复回看"是高频且高价值的**——用户三天后回来很可能就是想复习，不是想推进。每次 GET 都触发一次 LLM 调用，单人开发的成本结构扛不住。
>
> 第二条更隐蔽。"正在继续你上次的学习"听起来很贴心，但**把恢复做成 first-class UX 元素，等于反复提醒用户"我们这里会断"**。Gmail 草稿恢复之所以优雅，是因为它**静默**——用户根本不会注意。δ 如果带 loading 文案，就破了这个原则。
>
> 我的处理方案：
> - **触发时机**：不是 GET 时触发，是用户**点 Continue 时**才触发懒重生成。回看不烧钱。
> - **加载提示**：不要"正在继续上次的学习"，就是普通的"思考中..."骨架屏，跟正常生成时一模一样。**让恢复隐形**。
> - **失败兜底**：重试 1 次失败就退到 α + γ 那行小字，不要 N 次重试转圈。
>
> ## 4. 两个助手都没想到的盲点
>
> **盲点 1：三天后的小李大概率不是"学习 mood"。**
> 两个助手都默认用户回来是要"继续学"。但点回 URL 三天后的用户，**70% 是好奇/复习/找特定知识点**，只有 30% 是真的想接着推进。如果产品默认行为是"自动续上下一步"，对前 70% 是打扰。这意味着 canvas 顶部除了"继续"按钮，应该有"回看这节学过的内容"——把已完成的步骤变成可滚动的历史。
>
> **盲点 2：单人开发 + pre-PMF，这个 bug 出现频率极低。**
> 网络中断 + 恰好卡在 user 写入和 assistant 写入之间，估计 PineSnap 当前 DAU 下一周遇不到 3 次。**为这个场景做 δ 是过度工程**。P0 应该是事务化（半天搞定，根除问题），剩下的精力去做用户拉新和留存，而不是在恢复体验上雕花。
>
> **盲点 3：多用户/分享场景完全没讨论。**
> 如果未来 learning 可以分享 URL，B 用户点开 A 用户的孤立尾巴会发生什么？δ 方案在这里直接爆炸——给别人触发 LLM 调用、生成的内容算谁的？这个产品决策必须现在就明确。
>
> ## 5. 我的 1-2 周 Roadmap
>
> | 优先级 | 任务 | 时间 | 理由 |
> |---|---|---|---|
> | **P0** | 写入事务化（user + assistant 原子提交） | 0.5 天 | 根除 bug，比任何前端方案都重要 |
> | **P0** | 现有孤立 session 的一次性数据修复脚本（删 trailing user message） | 0.5 天 | 历史脏数据不能靠前端兼容 |
> | **P1** | α + γ：用户回来看到原题可重答，顶部加一行"上次学到这"小字 | 1 天 | 利用 testing effect，零额外成本 |
> | **P2** | 已学步骤的回看视图（canvas 上滑显示历史步骤） | 3 天 | 解决 70% 用户是来复习的真实需求 |
> | **不做** | δ 懒重生成 | — | 单人开发阶段不值得，事务化之后此 bug 几乎不再发生 |
> | **不做** | 章节 outline | — | pre-PMF 不需要 |
>
> **核心判断**：1 号被 2 号带偏了。2 号论证漂亮但忽略了学习科学和成本结构。**真正该做的是 C + α + γ，不是 C + δ**。把 δ 留到 PMF 之后、有题型真正强依赖生成的时候再说。

### 3.5 Sub-agent B（CTO）的完整 prompt

[完整 prompt 见对话记录，要点：扮演干过两次 YC 公司的实用主义 CTO，工程权衡和风险评估视角，包含 PineSnap 当前 route.ts 的具体代码，让 agent 评判 C 的工程坑、δ 的工程坑、有没有第三条路径、优先级 sanity check。]

### 3.6 Sub-agent B（CTO）的完整回复

> # 裁判意见：你们俩都把简单事搞复杂了
>
> ## 1. C 方案的工程坑——1 号没讲清楚
>
> **`onFinish` 不是 commit hook，是 happy path hook。** 这是核心误判。Vercel AI SDK 5 里 stream 中途 abort（client disconnect、网络断、provider 502）走 `onError`，`onFinish` 不会触发。client `stop()` 和 abort signal 也是。所以 1 号说的"原子写解决一切"——`onFinish` 根本就不在失败路径上跑，原子性是真的，但**保护范围只覆盖 LLM 已经吐完 token 的那一瞬间**，覆盖不到中途断流。这才是 bug 真正的高发区。要真兜底，得在 `onError` 里也写一份（带 partial content 或 error marker），而且 `onFinish` / `onError` 至少要互斥处理一次。
>
> **`waitUntil` + transaction 在 Vercel serverless 上**：Vercel 给 `waitUntil` 的 budget 在 Hobby/Pro 上是有上限的（30s 量级），且**不保证 100% 执行**——文档原话 "best effort"。把 transaction 塞进 `waitUntil` 等于把"原子写"建在一个 best-effort 后台任务上，逻辑自相矛盾。要真原子，要么 stream 结束后 `await` 写完再返回（牺牲 TTFB），要么接受 at-most-once 然后用 outbox 兜。
>
> **`Role.tool` 跟原子写没硬冲突**，但 transaction batch size 会变大（一次 5-10 条 message）。Prisma transaction 在长 stream 后才开始执行——connection pool 风险存在但不致命。
>
> ## 2. δ 方案的工程坑——更糟
>
> - **tRPC query 跑 1-2 秒 LLM**：违反 query 语义，React Query 会按 query 行为缓存/重试/refetch on focus，每次切回 tab 都可能再触发一次 LLM。必须改成 mutation + 独立 endpoint。
> - **并发重生成**：单人开发、单 dev 环境，没有 Redis 也没有 pg advisory lock 的现成基建。要做就得新引入一个组件。或者用 `SELECT ... FOR UPDATE` + 一个 `regenerating_at` 时间戳字段——又是新 schema。
> - **重试爆炸**：没有 rate limit、没有 user-level 配额。一个 refresh 死循环就能烧光 OpenAI 余额。必须加 `recovery_attempts` 字段 + cooldown，δ 实际工时不是 1 天，是 2-3 天。
> - **状态机**：要新加 enum 列、迁移、UI 三态（loading / recovered / failed-fallback-to-α）。这是给 pre-PMF 产品加技术债。
>
> **δ 是过度工程，砍掉。**
>
> ## 3. 被忽略的第三条路
>
> 最干净的两条：
>
> **A. `experimental_resume` + persistent stream id**：Vercel AI SDK 原生支持，专门为这个场景设计。stream 启动时把 streamId 写库，client 重连时 server 从 provider 续读。问题：依赖 provider 支持 resumable streams（OpenAI Responses API 支持），且需要 Redis-style stream store。对单人 pre-PMF 太重。
>
> **B. 服务端 sentinel + 前端宽容渲染**：user message 入库时同时写一个 `pending` 状态的 placeholder assistant row（或在 user row 上加 `awaiting_response: bool`）。`onFinish` 把 placeholder 替换为真内容，`onError` 把 placeholder 标记为 `failed` + 存错误原因。前端看到 `pending` 显示骨架屏（合理），看到 `failed` 显示"重试"按钮（用户主动）。**这就是经典的 outbox 极简版，半天能搞完，不需要 worker 也不需要 lock。**
>
> ## 4. 优先级 sanity check——1 号绕进去了
>
> **DB 里就一条卡死会话，大概率是你自己测出来的。** Pre-PMF、单人、没真实用户。1.5-2 天修一个发生概率 < 1% 的边缘 case，机会成本是 1.5-2 天没做产品 core value。这是经典的 over-engineering trap。
>
> 但也不能完全不管——下次再发生你又得手动 SQL，会越积越烦。**关键是定个工时上限：4 小时，不是 2 天。**
>
> ## 5. 我的最终 plan
>
> | 阶段 | 工作 | 工时 | 何时做 |
> |------|------|------|--------|
> | **P0 hotfix** | 手动 SQL 删那条孤立 user message | 5 min | 今天 |
> | **P0 防御** | `getState` 返回前过滤孤立 user（1 号的 A）+ 前端显示"上次回复中断，[重试]"按钮，点击后用现有 mutation 重发原 input | 2h | 今天 |
> | **P1 收口** | 把 `createMessage(user)` 从 LLM 调用前**移到 `onFinish` 里 + transaction**（1 号的 C，但明确知道它只覆盖 happy path）。同时在 `onError` 里写一行 console.error + Sentry，先观测再说 | 2h | 本周内 |
> | **不做** | δ、resume API、outbox worker、placeholder row、advisory lock | — | 等真有付费用户反馈再说 |
>
> **总计 4 小时，今天能 ship。**
>
> 核心判断：你现在的瓶颈不是数据完整性，是**有没有人愿意用**。手动重试按钮在 pre-PMF 阶段是 100% 可接受的 UX——Linear 早期、Notion 早期都有比这丑得多的兜底。等到 DAU 上 100、这个 bug 一周触发 10 次以上，再回来做 placeholder row 方案（B）。在那之前，**别再碰这块代码**。
>
> 1 号助手的工程直觉对（C 比 α 干净），但产品判断错（pre-PMF 不该花 2 天修边缘 case）。2 号助手的 δ 是典型的 AI 助手失控——给一个简单问题加了三层基建。两个都不及格。

---

## 4. 关键技术事实（带证据）

### 4.1 onFinish 在 stream abort 时不触发

**Vercel AI SDK 官方 troubleshooting 页面**：[Stream Abort Handling](https://ai-sdk.dev/docs/troubleshooting/stream-abort-handling)

原话：

> "When a streamText() stream is aborted, **onFinish is not called**. The abort handler immediately terminates the response, preventing the callback from executing."

**官方解决方案**：在 `toUIMessageStreamResponse` 配置里加 `consumeStream`：

```javascript
import { consumeStream } from 'ai';

return result.toUIMessageStreamResponse({
  onFinish: async ({ isAborted }) => {
    if (isAborted) {
      // Handle abort-specific cleanup
    }
  },
  consumeSseStream: consumeStream,
});
```

加了 `consumeStream` 之后 `onFinish` 会在 abort 时也触发，并通过 `isAborted: true` 区分。

**相关 GitHub issues**：
- [#7900 onFinish in toUIMessageStream should be called on abort](https://github.com/vercel/ai/issues/7900)
- [#8088 short abort signals trigger onError instead of onAbort](https://github.com/vercel/ai/issues/8088)
- [#4101 Abort errors in data stream not handled](https://github.com/vercel/ai/issues/4101)

### 4.2 waitUntil 是 best-effort

**Vercel 官方文档** [Vercel Functions API Reference](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package) 和 **Inngest blog** 均确认：

- `waitUntil` 给的 promise 和 function 共享超时上限（Hobby 60s / Pro 300s）
- 函数超时时 promise 被取消
- **没有 retry，没有 failure handling**
- 文档原话："waitUntil is not the tool for the job if the asynchronous operation affects critical business logic"

**对 PineSnap 当前代码的影响**：

`route.ts:194-217` 的写法：

```ts
onFinish: ({ response }) => {
  waitUntil(
    (async () => {
      try {
        for (const message of response.messages) {
          // ...
          await createMessage(conversationId, role, parts);
        }
      } catch (error) {
        logError("Failed to persist learn messages", error);
      }
    })()
  );
}
```

两层失败叠加：
1. `onFinish` 不在 abort 路径触发 → 大部分失败场景写入逻辑根本不跑
2. 即使 `onFinish` 触发了，`waitUntil` 是 best-effort → serverless 超时时写库会被取消

这就是为什么"卡死会话工厂"持续生产新会话——任何一层失败就出现 orphan。

---

## 5. 决策矩阵

各方案的对比（按"对用户体验最舒服"和"工程复杂度"两个维度）：

| 方案 | UX 评分 | 工程量 | 推荐人 | 我的判断 |
|------|--------|-------|-------|---------|
| 单 α（用户重答） | 中（loss aversion 但 testing effect 是收益） | 0.5 天 | Sub-agent A | 可做，但单做不够 |
| 单 δ（自动续跑） | 中（loading 提示泄露 bug + 烧 token） | 2-3 天 | Sub-agent 1 | **不做**（被两个 agent 同时否） |
| C + α + γ | 高（治标治本 + 学习科学加成） | 1.5-2 天 | Sub-agent A | 候选，但需先确认 C 怎么做 |
| C + δ + 兜底 | 高但代价大 | 2-3 天 | （我先前的方案） | **被推翻** |
| Sub-agent B 极简 4h | 中（手动 retry 按钮，pre-PMF 可接受） | 4 小时 | Sub-agent B | 候选，最务实 |
| **用户提的"不过滤 + 显式 Continue"** | **高**（用户控制权完整 + 不烧 token + 不泄露 bug） | **1-2 天** | 用户本人 | **强候选** |

**用户的方案细节**（详见对话）：
- 服务端不过滤 orphan
- 前端检测末尾是 user 时，渲染上次的选择（pre-fill 或对话续接卡片）
- 显式 Continue 按钮，点击才触发 AI

**Case 1**（上一步是 tool call）→ 干净，重渲染 quiz + 选项 pre-filled
**Case 2**（上一步是 text 追问）→ 需要单独的"对话续接"卡片设计，或考虑"canvas-led 学习禁止纯 text 步骤"这个产品约束

---

## 6. 留下的产品决策（待用户拍板）

### 6.1 短期：bug 修复路径

- 选 Sub-agent B 的 4 小时极简方案（手动 retry 按钮）
- 选用户的"不过滤 + 显式 Continue"方案（更优 UX，1-2 天）
- 选 Sub-agent A 的 C + α + γ（学习科学加持，1.5-2 天）

### 6.2 长期：相关产品决策

- **canvas-led 是否禁止纯 text 步骤**？强制 AI 每步必须以 tool call 收尾，会让架构更一致，也会限制 AI 的表达自由度
- **previous 回看功能**（设计师 agent 提的 P2）是否要做？这是用户在对话早期问过的"没有 previous 功能"的产品答案
- **多用户/URL 分享场景**：如果未来 learning 可以分享 URL，B 用户点开 A 用户的会话该看到什么？

### 6.3 技术债务

- `route.ts` 当前的 `waitUntil(onFinish(...))` 模式是**被 Vercel 官方明确反对**的用法。无论选哪个修复方案，都该改。
- `Role.tool` 这个 message role 让 transaction batch 变大（5-10 条），对原子写有边际影响。值得考虑是否合并到 assistant message 的 parts 里。

---

## 7. 这次决策过程的元层反思

1. **AI orchestrator 容易陷入"技术框架优先"的思维惯性**。我前两轮都在画 L1/L2/L3/L4 这种漂亮但脱离用户的层级。是用户的"你太在意技术上的事情"才把我拽回 UX-first。
2. **单个 sub-agent 的反馈仍可能是片面的**。Sub-agent 1 给的 δ 方案听起来最"高级"，但被 Sub-agent A（学习科学）和 Sub-agent B（工程实用主义）同时否定。**3+ 个独立视角才趋于稳定结论**。
3. **用户的产品直觉常常领先于 AI**。"不过滤 + 显式 Continue" 是用户提的，不是任何 AI agent 提的，但综合 UX 和工程代价是最佳方案之一。
4. **官方文档比 AI 推断更可靠**。Sub-agent B 关于 onFinish 行为的论断我最初半信半疑，但官方 troubleshooting 页面**字面证实了它**。涉及 SDK 行为时，**先查官方文档**，再相信任何 AI 的推理。

---

## 8. 参考资料

- [Vercel AI SDK · Stream Abort Handling](https://ai-sdk.dev/docs/troubleshooting/stream-abort-handling)
- [Vercel AI SDK · Chatbot Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence)
- [Vercel AI SDK · Chatbot Resume Streams](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams)
- [Vercel · waitUntil API Reference](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
- [Inngest · What is waitUntil and when should I use it](https://www.inngest.com/blog/vercel-cloudflare-wait-until)
- [Duolingo Engineering · Frontend Prediction in Mobile Apps](https://blog.duolingo.com/frontend-prediction/)
- [Ink & Switch · Local-first software](https://www.inkandswitch.com/essay/local-first/)
- [Smashing Magazine · Designing for Agentic AI: UX Patterns](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- [Roediger & Karpicke 2006 · Test-enhanced learning](https://pubmed.ncbi.nlm.nih.gov/16507074/)（testing effect 经典实验）
- 相关 GitHub issues：
  - [vercel/ai #7900 onFinish on abort](https://github.com/vercel/ai/issues/7900)
  - [vercel/ai #8088 short abort triggers onError](https://github.com/vercel/ai/issues/8088)
  - [vercel/ai #4101 Abort errors not handled](https://github.com/vercel/ai/issues/4101)

---

> 本文档由 Claude（orchestrator）+ 三个独立 sub-agent + 产品负责人共同产出。
> 决策待最终拍板。无论选哪个方案，本文档保留作为决策证据。
