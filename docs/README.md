# PineSnap 文档索引

## 目录结构

采用"领域为目录，时间序记录独立成目录"的混合结构：

```
docs/
├── capture/              # 采集链路（Chrome 扩展 + Worker + 鉴权）
├── learning/             # 学习体验（Canvas、A2UI、学习工具）
├── platform/             # 跨系统基础设施（DB / Auth / 存储契约）
├── decisions/            # 设计决策 ADR（跨领域，按编号）
├── performance/          # 性能优化记录（按日期）
├── incidents/            # 排障报告 / Bug 发现（按日期）
├── verification/         # E2E 验证日志
├── ops/                  # 产品/用户操作说明
├── tooling/              # 开发工具与协作指南（非产品文档）
└── competitive-research/ # 竞品调研
```

## 按领域导航

### capture/ 采集链路
- `auth-overview.md` / `auth-data-model.md` — 扩展鉴权的端到端时序与数据模型
- `context-and-job-model.md` — `CaptureContext` / `CaptureJob` / `CaptureArtifact` 三层模型
- `model-playbook.md` — 采集域速查手册（入门先看这个）
- `worker-service.md` — Cloud Worker 服务说明
- `chrome-extension.md` — 扩展端开发与联调
- `bilibili-cdn-audio.md` — bilibili 音频 CDN 专题

### learning/ 学习体验
- `canvas-tool-design.md` — Learning Canvas 工具设计

### platform/ 基础设施
- `database-data-dictionary.md` — 全库字段字典（所有模块共用真相）

### ops/ 产品操作
- `connect-bilibili.md` — 用户端 B 站账号连接说明

### tooling/ 开发工具
- `claude-code-plugin-skill-guide.md` — Claude Code 插件/Skill/命令参考
- `multi-session-worktree.md` — 多会话冲突时切 worktree 的操作手册

## 按类型导航（跨领域）

### decisions/ 设计决策
命名：`NNNN-主题.md`（编号递增）。ADR 风格：背景 / 选项对比 / 决策 / 理由。
- `0001-local-supabase-dev-env.md` — 本地开发使用 supabase start 而非远程 DB
- `0002-canvas-conversation-recovery-strategy.md` — Canvas 学习会话的中断恢复策略
- `0003-canvas-chat-architecture.md` — Canvas + Chat 架构重设计（Light Anchor）
- `0004-live-session-message-id.md` — Live-session 时 canvas 消息 id 的一致性契约（server 预生成 UUIDv7 → stream start 回写 → DB 同 id）

### performance/ 性能优化
命名：`YYYY-MM-DD-领域-主题.md`。记录"问题 / 指标前后 / 方案 / 验证"。
- `2026-04-16-sources-and-auth.md` — `/sources` API + middleware 鉴权优化（6s → 0.5s）
- `2026-04-17-learning-getstate-local-supabase.md` — `learning.getState` 崩溃修复 + 本地 Supabase 消除跨区延迟

### incidents/ 排障报告
命名：`YYYY-MM-DD-领域-主题.md`。记录"现象 / 根因 / 修复 / 预防"。
- `2026-04-14-bilibili-subtitle-mismatch.md` — B 站字幕错轨问题
- `2026-04-19-019bdc0c-orphan-cleanup.md` — 019bdc0c learning canvas 卡死会话脏数据清理
- `2026-04-19-canvas-chat-regression-cascade.md` — 0003 架构落地后 5 个层叠 regression（含 QA 方法论教训）

### verification/ 验证日志
- `e2e-log.md` — 端到端测试记录

## 新人推荐阅读顺序

1. `platform/database-data-dictionary.md` — 建立统一词汇
2. `capture/model-playbook.md` — 采集域入门
3. `capture/context-and-job-model.md` — 采集核心模型
4. `capture/auth-overview.md` — 扩展鉴权机制

## 文档维护规则

1. **触达路由/API/DB/权限/存储契约**：必须先改 OpenSpec，通过后同步更新 `platform/` 或 `capture/` 下对应真相文档。
2. **新字段**：必须在 `platform/database-data-dictionary.md` 补齐定义，禁止"代码有字段、文档没定义"。
3. **沉淀触发规则**：见项目根 `CLAUDE.md` 的"文档沉淀触发清单"一节。
