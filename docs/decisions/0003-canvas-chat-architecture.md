# 0003 · Canvas + Chat 架构重设计

> 状态：**产品方向已确定，技术实施待 openspec 提案**
> 日期：2026-04-18
> 分支：feat/learning-experience
> 衍生自：[0002 · Canvas 学习会话的中断恢复策略](./0002-canvas-conversation-recovery-strategy.md)

---

## 写在前面：为什么有这份文档

0002 写的是 bug 恢复策略——表层问题。但产品负责人在那次讨论里抛出的两个反馈把方向引到了更深的层面：

> "我们 chat 不是主要的，我们是一个 canvas-led 的项目，用户只在乎学习"
>
> "你太在意技术上的事情？我认为应该先从用户体验出发去考虑这件事情"

顺着这两个反馈走，发现 019bdc0c 那条卡住会话的根本原因不是写入逻辑有 bug，是 **canvas 和 chat 的产品定位没有划清**——它们共用同一条 conversation，互相污染。

修补那个 bug 治不了根。要把整个 canvas + chat 的架构重新想一遍。这份文档就是这个重设计的产物。

---

## 一、最终产品决策

### 1.1 canvas 是主舞台，严格 step 化

- canvas 的每一步必须是 **tool 调用**：quiz / Socratic / 填空 / 内容页
- **禁止纯 text 步骤**——AI 不能用一段文字"追问"用户
- 一步 = 呈现 tool + 用户响应 + AI 推进到下一 tool

约束的好处：
- canvas history 永远干净，每一步都可以独立显示
- 不存在"末尾是 user text"这种歧义状态
- previous 翻页有明确的"页"概念

### 1.2 canvas 支持 previous（用户可以翻看历史）

用户能左右翻已经完成的 step。每个 step 包括：
- 当时的题（quiz / Socratic / 内容）
- 当时用户的答案
- **当时这一步发生的讨论**（见 1.4）

previous 不是一个独立的"目录页"，是 canvas 自带的左右翻页能力。

### 1.3 chat 是独立 conversation，与 canvas 解耦

- 一个 learning 持有 **两条 conversation**：
  - **canvas conversation**：严格 tool-only
  - **chat conversation**：自由文本对话
- chat 消息 **anchored 到** canvas 的某一个 step
- chat AI 可读 canvas 当前 step 的内容作为 context，但**不能改 canvas 进度**

数据模型示意：

```
learning
  ├── canvas conversation (kind=canvas)
  │     ├── step 1: assistant tool-call (renderQuizMultiple)
  │     ├──         tool result (用户答案)
  │     ├── step 2: assistant tool-call (renderSocraticBranch)
  │     ├──         tool result
  │     └── ...
  │
  └── chat conversation (kind=chat)
        ├── msg: { anchored_to: canvas.step_2, role: user, "能给个例子吗" }
        ├── msg: { anchored_to: canvas.step_2, role: assistant, "比如有个 users 表..." }
        └── ...
```

### 1.4 UI：右侧 collapsible sidebar

- **默认**：满屏 canvas + 右侧一条窄竖条（"?" icon），可发现但不入侵
- **触发**：点窄条 / 快捷键（建议 `Cmd+/` 或 `Cmd+K`）→ 侧边栏从右侧展开
- **侧边栏内部布局**（从上到下）：
  - 顶部 header：显示"关于「当前 step 标题」"
  - 中间：scroll 区，当前 step 锚定的讨论历史
  - 底部：输入框（**贴在 sidebar 内部最底，不在屏幕底部**）
- **canvas 永远不被压缩**——sidebar 占用宽度但不挤压 canvas 内容（canvas 不 resize）

ASCII 示意：

```
默认状态：
┌──────────────────────────────────┬─┐
│                                  │?│
│       CANVAS（满宽减一条）         │ │
│                                  │ │
└──────────────────────────────────┴─┘

展开状态：
┌──────────────────────────────┬─────────────┐
│                              │ 关于「RLS」< │
│                              ├─────────────┤
│       CANVAS                 │  讨论历史    │
│                              │   ↕ 滚动     │
│                              │              │
│                              ├─────────────┤
│                              │ 问什么... [↑]│
└──────────────────────────────┴─────────────┘
```

### 1.5 切 step 时 sidebar 自动跟随

- 用户翻 previous → sidebar header 同步切换为"关于上一步的题"
- 中间区域显示锚定到那一步的讨论历史
- 没讨论的 step 显示空状态："这一步没问过问题"
- 输入框依然可用，可以补问

### 1.6 移动端

**先不考虑**。本次设计聚焦桌面。移动端的 fallback（底部抽屉式）见 0002 的方案讨论，留作 future work。

---

## 二、用户视角的体验流

### 2.1 小李的故事（理想路径）

晚上 9 点，小李打开 PineSnap 学 Supabase。

满屏 canvas 显示一道 Socratic 题："RLS 限制的对象是什么？（能/不能）"。右下角有个不显眼的 "?" 窄条。

他不确定，不想随便点。鼠标移到 "?" 窄条 → 点开。

侧边栏滑出，header 写着"关于「RLS 限制的对象」"，中间空空，底部一个输入框。他打字："能给个例子吗"。

AI 在侧边栏里流式回答："比如有个 users 表，每行是一个用户的资料..."。

他读完，**题还在 canvas 原位**。他点了"能"。canvas 滑到下一步：单选题"以下哪些做法是安全的"。

侧边栏 header 自动变成"关于「下一题」"，**中间清空**——上一题的讨论被绑定在上一题，不打扰他现在做新题。

他想回看刚才那道 Socratic 是怎么讨论的——点 canvas 左侧的箭头翻 previous。canvas 回到 Socratic 题，**侧边栏同步刷新**为之前那段对话。一目了然。

### 2.2 关键的"问 ≠ 答"

- **答题**（点选项 / 选 yes-no / 填空 widget 提交）→ 进 canvas history，是正式一步
- **提问**（在 sidebar 输入框打字）→ 进 chat history，挂在当前 step 下

系统区分这两件事，用户不需要区分。

### 2.3 输入框的语义

PineSnap 在 canvas 区域**没有通用输入框**。所有"打字"都发生在 sidebar 里，且语义统一为"提问"。

避免了"这框是答题还是提问"的歧义。

---

## 三、和 0002 的关系

| 维度 | 0002 | 0003 |
|------|------|------|
| 定位 | bug 调查 + 恢复策略 | 产品架构重设计 |
| 焦点 | "怎么救卡死会话" | "为什么会卡死，怎么从根本上不卡死" |
| 范围 | 写入路径 + 恢复 UX | canvas 形态 + chat 定位 + 数据模型 |
| 方案空间 | α/β/γ/δ + C + A | 全新架构 |

0003 把 0002 的方案空间**推翻并取代**：
- 不再有"过滤孤立 user / 不过滤 + 显示选择"这种二选一——因为新架构下 canvas conversation 严格 tool-only，**末尾不会出现孤立 user text**
- 0002 的"卡住恢复"问题在 0003 下退化为"用户答完 tool 但 AI 还没生成下一步"，配合 sidebar 提问能力，体验上不再是"卡死"
- 但 0002 里的关键技术事实（onFinish 不在 abort 时触发、waitUntil 是 best-effort）**仍然有效**，新架构的实施需要遵守

0002 仍保留作为**bug 调查的真实记录**和**onFinish/waitUntil 技术证据**的依据。

---

## 四、待定细节（openspec 提案阶段落地）

### 4.1 "step" 的精确定义

- 选项 a：一条 assistant message = 一个 step（即使包含多个 tool call）
- 选项 b：一个 tool call = 一个 step（一条 assistant message 可能展开为多个 step）

影响 previous 翻页粒度。**初步倾向**：选 a（与 useChat 的 message 概念对齐，简单），需 openspec 确认实际场景。

### 4.2 chat AI 的边界

- 它能主动建议"你应该去回答上面的题吗"？
- 它能完成 canvas tool 的提交吗（理论上不该）？
- 它能调用 tool 吗？

**初步倾向**：chat AI **只能输出 text**（不带 tool 调用能力），完全只回答问题，不染指 canvas 状态。

### 4.3 chat AI 能见的范围

- 只见当前 step 锚定的讨论？
- 见这个 learning 整段 chat 历史？
- 见 canvas 整段 history？

**初步倾向**：见当前 step 锚定的讨论 + canvas 整段 history（只读）。这样它能回答"上一步那个 X 是什么意思"这种跨 step 的问题。

### 4.4 token 预算

chat 每条都烧 token。早期不限，监控成本。如果发现单 learning chat 消息中位数超过 20，再加限制。

### 4.5 旧脏数据处理

- 019bdc0c 这条手动修复（清掉 [13][14]）作为新逻辑的活体测试
- 全 DB 扫描"末尾是 user text"的会话，统一处理
- 处理方式由 openspec 阶段定夺

---

## 五、实施路径

```
1. /openspec-propose 生成完整提案
   涵盖：
   - 数据模型变更（双 conversation + anchoring）
   - canvas tool-only 强制（system prompt + 兜底）
   - canvas previous 导航 UI
   - sidebar UI（默认收起、展开、step 跟随）
   - chat AI endpoint（独立 system prompt + context 注入）
   - 旧脏数据清理脚本

2. /plan-eng-review 评审架构和数据流

3. /openspec-apply-change 分阶段实现
   - phase 1: 数据模型 + 服务端（双 conversation、anchoring）
   - phase 2: canvas previous 导航 + tool-only 强制
   - phase 3: sidebar UI + chat 接入
   - phase 4: 旧脏数据清理脚本
```

---

## 六、参考资料

- [0002 的全部引用](./0002-canvas-conversation-recovery-strategy.md)（onFinish 行为、waitUntil 可靠性、Duolingo、Cursor、Claude Desktop UX 等）
- Cursor 的 right-side chat panel：side-by-side 编辑 + chat 的成熟形态
- Claude Desktop 的 chat 布局：垂直分布的 header / scroll / input
- Linear 的 right rail：常驻 + 折叠
- Notion 的 comment sidebar：anchored 评论的范例
- Apple Maps 的 bottom sheet：移动端 fallback 时的参考

---

> 本文档由 Claude orchestrator + 产品负责人多轮迭代产出。
> 设计方向已确认，技术细节待 openspec proposal 阶段定稿。
