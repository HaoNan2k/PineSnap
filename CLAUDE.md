# PineSnap — Claude Code 项目指南

## 项目简介

PineSnap 是一个基于 React 的 AI 应用。

## 编码行为准则

通用 LLM 行为约束，减少常见的 AI 编码失误。对于简单任务可自行判断松紧度。

### 1. 先想再写

**不要假设。不要隐藏困惑。主动暴露权衡。**

在动手实现之前：
- 明确说出你的假设。不确定就问。
- 如果存在多种理解方式，列出来——不要默默选一个。
- 如果有更简单的方案，说出来。该推回时就推回。
- 如果有不清楚的地方，停下来。说明哪里不清楚，然后问。

### 2. 简单优先

**用最少的代码解决问题。不做投机性开发。**

- 不加没被要求的功能。
- 不为只用一次的代码搞抽象。
- 不加没被要求的"灵活性"或"可配置性"。
- 不为不可能发生的场景加错误处理。
- 如果写了 200 行但 50 行就够，重写。

自问："一个资深工程师会说这过度复杂了吗？" 如果会，简化。

### 3. 精准修改

**只动必须动的。只清理自己造成的问题。**

编辑现有代码时：
- 不要顺手"改进"相邻的代码、注释或格式。
- 不要重构没坏的东西。
- 匹配现有代码风格，即使你会用不同方式写。
- 如果发现无关的死代码，提一下——但不要删。

当你的修改产生了孤立代码时：
- 删除因**你的修改**而变得无用的 import/变量/函数。
- 不要删除修改前就已存在的死代码，除非被要求。

检验标准：每一行改动都应该能直接追溯到用户的需求。

### 4. 目标驱动执行

**定义成功标准。循环直到验证通过。**

把任务转化为可验证的目标：
- "加验证" → "为非法输入写测试，然后让测试通过"
- "修这个 bug" → "写一个复现 bug 的测试，然后让它通过"
- "重构 X" → "确保重构前后测试都通过"

多步任务时，先列简要计划：
```
1. [步骤] → 验证：[检查项]
2. [步骤] → 验证：[检查项]
3. [步骤] → 验证：[检查项]
```

强成功标准让你能独立循环。弱标准（"让它能用"）需要反复确认。

---

**这些准则生效的标志：** diff 中不必要的改动更少，因过度复杂化导致的返工更少，澄清性提问出现在实现之前而非犯错之后。

## 开发规范

> 分支、提交、沟通等通用规范见全局 `~/.claude/CLAUDE.md`，此处仅列项目特有规则。

## 文档维护

拒绝 vibe coding。每次任务结束时对照沉淀触发清单（设计决策 / 复杂模块 / 性能优化 / 有教训价值的排障），命中则调用 `sediment-doc` skill 起草文档，用户确认后再写。触发条件、命名约定、模板和写作原则详见 skill。

文档目录结构和导航见 `docs/README.md`。

其他硬性规则：

- 项目文档使用简体中文
- 安装新插件 / skill / 命令时，同步更新 `docs/tooling/claude-code-plugin-skill-guide.md`
- 触达路由 / API / DB / 权限 / 存储契约：先改 OpenSpec，再同步 `docs/platform/` 或对应领域目录下的真相文档
- 新 DB 字段必须在 `docs/platform/database-data-dictionary.md` 补齐定义

## 技术栈

- React（前端）
- Next.js
- TypeScript
- Framer Motion（动画）

## A2UI 架构原则

A2UI 采用 Headless Component 理念：交互原语与视觉表现分离。

- **交互原语层（稳定）：** SingleChoice / MultipleChoice / FillInBlank / SocraticBranch。AI 模型只需知道这 4 种 tool schema。
- **视觉层（可变）：** 每个 case 可以定制完全不同的视觉表现。新样式不需要改 AI 工具定义。
- **数据契约层：** `{ type: "single_choice", selected: "B" }` 等标准格式，AI 只看这层。

原语扩展时机：当新的交互模式的数据契约真正不同（如 Ordering 排序、Slider 连续值、Matching 配对）时才加，纯视觉变化不加新原语。

## Demo Case 设计规范

- 模拟 UI 内容要尽量真实，引导/教学文字放在模拟 UI 外面
- 交互引导优先用视觉（dim + highlight、hotspot 脉冲点），避免文字指令
- Continue 语义 = 这一步的交互完成了（不管对错），不卡用户
- 答错后显示正确答案反馈，Continue 立刻可用
- 最后一步用叙事动画做总结，不用大段文字

## 竞品调研

竞品分析文档位于 `docs/competitive-research/`。在讨论产品方向、功能设计或差异化时参考这些文档。

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## 协作飞轮

> 通用协作飞轮机制见全局 `~/.claude/CLAUDE.md`，此处仅补充项目特有的沉淀规则。

## Health Stack

- typecheck: tsc --noEmit
- lint: eslint .
