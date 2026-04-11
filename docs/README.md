# Docs 导航（开发者友好版）

这份索引用于快速定位 PineSnap 当前数据模型与采集链路的真相文档。

## 推荐阅读顺序（新人）

1. `database-data-dictionary.md`
  全量表结构与字段语义，先建立统一词汇。
2. `capture-model-playbook.md`
  采集域速查手册（对象/过程/结果/输入 + 高风险误区）。
3. `capture-context-and-job-model.md`
  CaptureContext、状态机、幂等与主产物规则的详细设计。
4. `chrome-extension-bilibili-capture.md`
  扩展端联调与发布前验证清单。
5. `capture-auth-data-model.md` / `capture-auth-overview.md`
  扩展鉴权数据模型 + 端到端时序。

## 文档分层

- **模型真相源**
  - `database-data-dictionary.md`
  - `capture-context-and-job-model.md`
  - `capture-auth-data-model.md`
- **工程速查**
  - `capture-model-playbook.md`
  - `chrome-extension-bilibili-capture.md`
- **产品/操作说明**
  - `connect-bilibili.md`
- **历史排障记录**
  - `bilibili-subtitle-track-mismatch-bug-report.md`

## 维护规则

1. 触达路由/API/DB/权限/存储契约，必须先改 OpenSpec。
2. OpenSpec 通过后，同步更新本目录对应真相文档。
3. 新字段必须在 `database-data-dictionary.md` 补齐定义，禁止“代码有字段、文档没定义”。