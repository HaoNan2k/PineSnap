# Docs 导航（2026-04）

这份索引用于快速判断：**该看哪份文档**。

## 核心文档（当前真相源）

- `capture-model-playbook.md`  
  采集域速查手册（对象/过程/结果/输入 + 常见误区），给人和 Agent 首选。

- `capture-context-and-job-model.md`  
  CaptureContext 与三层模型的详细说明（字段、关系、接口）。

- `capture-auth-data-model.md`  
  扩展鉴权数据模型长期文档（`CaptureAuthCode` / `CaptureToken`）。

- `chrome-extension-bilibili-capture.md`  
  B 站扩展开发与验证清单（当前默认客户端路径）。

## 参考文档（仍可用，但非第一阅读优先）

- `capture-auth-overview.md`  
  鉴权机制时序与背景解释（偏教学说明，和 data-model 互补）。

- `connect-bilibili.md`  
  产品侧连接说明（面向操作流程）。

## 历史/排障资料（按需看）

- `bilibili-subtitle-track-mismatch-bug-report.md`  
  专项故障分析文档，不是日常开发入口。

## 维护约定

1. 涉及采集模型字段/状态机变更，先改 OpenSpec，再同步：
   - `capture-model-playbook.md`
   - `capture-context-and-job-model.md`
2. 涉及鉴权流程/scope 变更，必须同步：
   - `capture-auth-data-model.md`
   - `capture-auth-overview.md`
