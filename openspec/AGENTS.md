# OpenSpec 指南

本文件用于指导 AI 编码助手在本项目中使用 OpenSpec 进行“规格驱动开发”。

## TL;DR 快速清单

- 先查现状：运行 openspec spec list --long 与 openspec list（全文搜索再用 rg）
- 明确范围：新增 capability 还是修改既有 capability
- 选择唯一的 change-id：kebab-case，动词开头（add-/update-/remove-/refactor-）
- 脚手架：proposal.md、tasks.md、按需 design.md，并为受影响 capability 编写 delta spec
- 编写 deltas：使用固定操作标题（见下文），每条 Requirement 至少 1 个 Scenario
- 严格校验：openspec validate <change-id> --strict
- 审批门禁：提案未批准前不要进入实现阶段

## 三阶段工作流

### 阶段 1：创建变更（changes/）
当你要做以下事情时，应创建提案：
- 新功能/新能力
- 破坏性变更（API、schema）
- 架构或模式调整
- 会改变行为的性能优化
- 安全策略调整

通常不需要提案的情况：
- 仅修复 bug（恢复既有规范行为）
- 拼写/格式/注释
- 非破坏性的依赖升级
- 仅配置变更
- 为现有行为补测试

推荐流程：
1) 阅读 openspec/project.md
2) 运行 openspec list 与 openspec list --specs
3) 选择 change-id 并创建目录 openspec/changes/<change-id>/
4) 编写 proposal.md、tasks.md、按需 design.md
5) 为受影响 capability 编写 delta spec
6) 运行 openspec validate <change-id> --strict

### 阶段 2：实现变更（apply 阶段）
实现阶段按 tasks.md 的清单逐条完成，并在完成后将勾选项更新为 - [x]。
注意：提案未批准前不得开始实现。

### 阶段 3：归档（archive）
部署后以单独 PR 归档变更：
- 移动 changes/<id>/ 到 changes/archive/YYYY-MM-DD-<id>/
- 若 capability 的“真相规范”发生变化，同步更新 openspec/specs/
- 归档后再次运行 openspec validate --strict

## 关键格式约定（严格）

### Delta 操作标题（必须使用固定英文，不要翻译）
- ## ADDED Requirements
- ## MODIFIED Requirements
- ## REMOVED Requirements
- ## RENAMED Requirements

### Requirement / Scenario 标题格式
- Requirement 标题必须是三级标题：### Requirement: ...
- Scenario 标题必须是四级标题：#### Scenario: ...
- 每条 Requirement 必须至少包含 1 个 Scenario

### 规范性措辞
建议使用 SHALL / MUST（可嵌入中文句子中，例如“系统 SHALL ...”），以保持一致的规范表达。

## 常用命令

~~~bash
openspec list
openspec list --specs
openspec show <item>
openspec validate <item>
openspec validate <change-id> --strict
openspec archive <change-id> --skip-specs --yes
~~~

## 常见校验错误

- “Change must have at least one delta”
  - 检查 changes/<id>/specs/ 下是否存在 .md
  - 检查 delta 文件是否包含上述固定操作标题

- “Requirement must have at least one scenario”
  - 检查是否使用 #### Scenario: 四级标题

## 目录结构参考

~~~
openspec/
├── project.md
├── specs/
│   └── <capability>/
│       └── spec.md
└── changes/
    ├── <change-id>/
    │   ├── proposal.md
    │   ├── tasks.md
    │   ├── design.md
    │   └── specs/
    │       └── <capability>/
    │           └── spec.md
    └── archive/
~~~
