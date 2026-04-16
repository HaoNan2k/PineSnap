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

- 始终在功能分支上工作，不要直接提交到 main
- 仅在用户明确要求时才推送到远程仓库
- 提交信息中不要添加 AI 共同作者标注

## 文档维护

当安装新的插件、skill 或命令时，必须同步更新 `docs/claude-code-plugin-skill-guide.md`。主动提醒用户并确认后再更新。

## 技术栈

- React（前端）
- Next.js
- TypeScript

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

持续优化人机协作的闭环机制：

### 任务前：方案选型检索
涉及 UI/UX 实现、架构选型、工具选择等方案性问题时，先用 WebSearch 检索当前最佳实践，再结合项目实际情况给出建议。

### 任务后：沉淀复盘
每次任务完成后，主动评估是否有值得沉淀的内容，以表格形式向用户建议：

| 沉淀内容 | 建议层级 | 理由 |
|----------|---------|------|
| 具体内容 | Memory / CLAUDE.md / Skill | 为什么值得沉淀 |

用户确认后再执行写入。

### 沉淀层级判断
- **Memory**：个人偏好、一次性发现、上下文信息
- **CLAUDE.md**：硬性规则、反复验证的工作流
- **Skill**：一个模式被成功使用 2-3 次后，提炼为可复用的 Skill

## Health Stack

- typecheck: tsc --noEmit
- lint: eslint .
