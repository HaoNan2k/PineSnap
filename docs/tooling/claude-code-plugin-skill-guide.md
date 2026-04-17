# Claude Code 命令与插件参考手册

> **维护规则：** 当安装新的插件、skill 或命令时，必须同步更新本文档。

---

## 一、Claude Code 内置命令

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/help` | 查看帮助信息 | 不确定某个功能怎么用时 |
| `/compact` | 压缩对话上下文 | 长对话变慢时，压缩历史保留关键信息 |
| `/clear` | 清空当前对话 | 开始全新任务时 |
| `/plan` | 进入计划模式 | 复杂任务先出方案再实现，避免返工 |
| `/fast` | 切换快速输出模式 | 同模型更快响应，适合简单任务 |
| `/effort` | 调整推理深度 | low/medium/high，简单任务用 low 省 token |
| `/hooks` | 管理钩子 | 查看、编辑、启用/禁用自动化钩子 |
| `/plugin` | 管理插件 | 浏览 marketplace、安装/卸载/启用/禁用插件 |
| `/loop` | 循环执行任务 | 定时轮询、持续监控、反复执行 |
| `/schedule` | 管理定时任务 | 创建 cron 定时远程 agent |

---

## 二、已安装插件与 Skill 一览

### 2.1 OpenSpec — Spec 驱动开发

**来源：** [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)
**安装方式：** `npm install -g @fission-ai/openspec@latest` + `openspec init`
**核心理念：** 先定义再编码，通过结构化 spec 减少 AI 幻觉和返工

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/opsx:propose` | 发起新需求提案 | "我想加一个拍照识别功能" → 生成结构化 spec |
| `/opsx:apply` | 根据 spec 实现代码 | spec 确认后，按任务列表逐步实现 |
| `/opsx:archive` | 归档已完成的变更 | 功能上线后，将 spec 归档留底 |
| `/opsx:explore` | 探索模式 | 还没想清楚具体要做什么，先调研、发散思考 |

**典型工作流：**
```
/opsx:propose "给 PineSnap 加音频采集功能"
  → 生成 spec（需求、设计、任务列表）
  → 你 review 并确认
/opsx:apply
  → 按 spec 逐任务实现
/opsx:archive
  → 完成后归档
```

---

### 2.2 Impeccable — UI 设计质量

**来源：** [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
**安装方式：** `npx skills add pbakaus/impeccable --yes`
**核心理念：** 让 AI 生成的 UI 摆脱"AI 味"，17 个设计命令 + 25 条反模式检测

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/impeccable craft` | 从零构建高质量 UI | 需要创建新页面或组件时 |
| `/impeccable teach` | 建立项目设计上下文 | 首次使用时运行一次，让 AI 了解你的设计风格 |
| `/impeccable extract` | 提取可复用组件和 token | 将临时样式沉淀为设计系统 |
| `/polish` | 最终质量打磨 | 上线前修复对齐、间距、一致性等微细节 |
| `/audit` | 技术质量审查 | 检查可访问性、性能、响应式、反模式，生成评分报告 |
| `/critique` | UX 设计评审 | 评估视觉层次、信息架构、认知负荷，量化评分 |
| `/adapt` | 响应式适配 | 让设计适配不同屏幕、设备、平台 |
| `/animate` | 添加动效 | 为功能添加有意义的动画和微交互 |
| `/bolder` | 增强视觉冲击力 | 设计太平淡、太安全时，增加表现力 |
| `/quieter` | 降低视觉强度 | 设计太过花哨、刺激时，回归克制 |
| `/clarify` | 优化 UX 文案 | 改善错误提示、标签、引导文字的清晰度 |
| `/colorize` | 增添色彩 | 界面太单调、灰暗时，添加策略性色彩 |
| `/delight` | 增加愉悦感 | 添加个性、惊喜、让人记住的细节 |
| `/distill` | 简化设计 | 去除不必要的复杂度，回归本质 |
| `/layout` | 优化布局 | 修复间距不一致、视觉层次弱、网格单调 |
| `/optimize` | UI 性能优化 | 解决加载慢、动画卡顿、包体积过大 |
| `/overdrive` | 突破常规 | shader、物理动画、滚动驱动效果，60fps 级别 |
| `/shape` | UX 规划 | 写码前做结构化发现访谈，产出设计 brief |
| `/typeset` | 排版优化 | 修复字体选择、层级、大小、可读性 |

**典型应用场景：**
- 新建页面：`/shape` → `/impeccable craft` → `/polish`
- 上线前审查：`/audit` → 修复问题 → `/polish`
- 设计太平淡：`/bolder` 或 `/colorize`
- 性能问题：`/optimize`

---

### 2.3 GStack — 多角色工作流

**来源：** [garrytan/gstack](https://github.com/garrytan/gstack)（Y Combinator CEO Garry Tan）
**安装方式：** `git clone` + `./setup`
**核心理念：** 9 种认知模式（CEO、工程经理、QA、设计师等），让 AI 在不同阶段切换专业视角

#### 需求与规划

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/office-hours` | CEO 视角需求讨论 | 挑战前提、追问本质、找到最窄切入点 |
| `/plan-ceo-review` | CEO 视角方案审查 | 扩大视野、选择性深入、挑战假设 |
| `/plan-eng-review` | 工程经理视角审查 | 评估技术可行性、架构合理性 |
| `/plan-design-review` | 设计视角审查 | 评估 UX/UI 方案 |
| `/plan-devex-review` | 开发者体验审查 | 评估文档、上手流程、TTHW |
| `/autoplan` | 自动规划并执行 | 自动拆解任务并顺序执行，遇到关键决策时暂停 |

#### 开发与调试
    
| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/investigate` | 根因分析调试 | "这个 bug 怎么回事" → 分析、假设、验证、修复 |
| `/pair-agent` | 多 agent 协作 | 让两个 AI agent 配对工作 |
| `/browse` | AI 控制浏览器 | 验证页面状态、截图对比、响应式测试 |
| `/codex` | Codex 式代码审查 | 对抗模式挑战你的代码 |
| `/freeze` | 锁定编辑目录 | 调试时防止误改无关代码 |
| `/unfreeze` | 解除目录锁定 | 调试完毕恢复正常 |
| `/careful` | 安全模式 | 在破坏性命令前加警告（rm -rf、DROP TABLE 等） |
| `/guard` | 完整安全模式 | careful + freeze 的组合 |

#### 质量保障

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/qa` | 全面质量测试 + 自动修复 | 测试 → 发现 bug → 修复 → 重新验证，循环直到通过 |
| `/qa-only` | 仅测试不修复 | 只生成测试报告和 bug 列表，不动代码 |
| `/review` | 代码审查 | 交叉引用分析，对每个问题打分 |
| `/design-review` | 设计质量审查 | 检查 AI slop 反模式、慢交互，自动修复 |
| `/devex-review` | 开发者体验审查 | 模拟新手走一遍上手流程，计时并截图 |
| `/health` | 代码健康评分 | lint、测试覆盖率、死代码检测，0-10 综合评分 |
| `/benchmark` | 性能基准测试 | 页面加载时间、Core Web Vitals、资源大小 |
| `/canary` | 金丝雀监测 | 定期截图对比，检测性能回归和页面故障 |
| `/cso` | 安全审计 | 依赖供应链、CI/CD 安全、OWASP Top 10 |

#### 设计

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/design-consultation` | 设计咨询 | 生成完整设计系统（美学、排版、配色、布局、动效） |
| `/design-html` | HTML 设计实现 | 将已批准的 mockup 转为代码 |
| `/design-shotgun` | 设计方案探索 | 快速生成多个设计方案，收集反馈后迭代 |

#### 发布与运维

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/ship` | 发布流程 | 更新 CHANGELOG → commit → push → 创建 PR |
| `/land-and-deploy` | 合并部署 | 合并 PR + 生产金丝雀检查 |
| `/document-release` | 发布文档更新 | 根据 diff 更新 README/ARCHITECTURE/CHANGELOG |
| `/checkpoint` | 保存进度断点 | 长任务中间保存状态，方便跨会话恢复 |
| `/retro` | 回顾总结 | 代码质量指标、趋势追踪、团队贡献分析 |
| `/learn` | 知识沉淀 | 查看/管理跨会话积累的经验 |

#### 工具与配置

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/gstack-upgrade` | 升级 GStack | 保持最新版本 |
| `/open-gstack-browser` | 启动 GStack 浏览器 | AI 控制的 Chromium + sidebar 扩展 |
| `/setup-browser-cookies` | 配置浏览器 cookie | 让 AI 浏览器能访问需要登录的页面 |
| `/setup-deploy` | 配置部署环境 | 初始化部署相关设置 |

---

### 2.4 code-review — Anthropic 官方代码审查

**来源：** [anthropics/claude-code](https://github.com/anthropics/claude-code/tree/main/plugins/code-review)（Anthropic 官方）
**安装方式：** `npx claude-plugins install @anthropics/claude-code-plugins/code-review`
**核心理念：** 5 个并行 Sonnet agent 独立审查，只输出高置信度问题

| 命令 | 用途 | 应用场景 |
|------|------|---------|
| `/code-review` | 全面代码审查 | 在 PR 分支上运行，5 个 agent 并行审查 |
| `/code-review --comment` | 审查并评论到 PR | 自动将审查结果发布为 PR comment |

**审查维度：**
- CLAUDE.md 合规性检查
- Bug 检测
- 历史上下文分析
- PR 历史对比
- 代码注释质量

**典型应用场景：**
- 提 PR 前自查：`/code-review`
- CI 中自动审查：`/code-review --comment`

---

### 2.5 已安装的其他工具

| 工具 | 类型 | 用途 |
|------|------|------|
| **Context7** | MCP 服务 | 查询最新 API 文档，替代过时的训练数据 |
| **Claude-in-Chrome** | MCP 服务 | 浏览器自动化，操作 Chrome 页面 |
| **Vercel** | 插件 | Vercel 部署相关功能 |

---

## 三、常用工作流速查

### 新功能开发
```
/opsx:propose "需求描述"     → 生成 spec
review spec                  → 确认
/opsx:apply                  → 实现
/audit                       → 技术审查
/polish                      → 质量打磨
/code-review                 → 代码审查
/ship                        → 发布
```

### Bug 修复
```
/investigate                 → 根因分析
修复代码                      → 实现
/qa                          → 测试验证
/code-review                 → 审查
/ship                        → 发布
```

### UI 设计改进
```
/impeccable teach            → 建立设计上下文（首次）
/shape                       → UX 规划
/impeccable craft            → 构建 UI
/audit                       → 技术审查
/polish                      → 打磨细节
```

### 安全与性能审计
```
/cso                         → 安全审计
/benchmark                   → 性能基准
/health                      → 代码健康评分
/optimize                    → UI 性能优化
```
