# PineSnap — Claude Code 项目指南

## 项目简介

PineSnap 是一个基于 React 的 AI 应用。

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
