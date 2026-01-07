# refactor-bilibili-capture-to-resource Proposal

## 为什么要做？

当前 B 站采集（Userscript → `POST /api/capture/bilibili`）会直接创建 `Conversation`/`Message` 并跳转到对话。这会把“采集原始结构化数据”和“对话整理/学习”强耦合在一起：

- 采集得到的结构化信息（来源 URL、BV、分 P、时间戳、段落分组等）会在转换为文本后丢失细节
- 对话创建与跳转会让采集流程不可控（例如用户只想先收集素材，不想立刻进入聊天）
- 后续要做“素材库/搜索/去重/二次加工”会变得困难

本变更引入 `Resource` 实体，把采集结果以结构化 JSON 直接入库，解耦“采集”与“对话”。

## 范围

- 服务端：`POST /api/capture/bilibili` 不再创建对话/消息，而是创建一条 `Resource`
- 数据库：新增 `Resource` 模型（PostgreSQL `jsonb` 存储原始 payload）
- 客户端：Userscript 移除自动打开对话页，仅提示“已存入素材库”

## 非目标

- 不实现“素材库 UI/列表/检索”
- 不对历史已采集的数据做回填迁移
- 不改动鉴权模型（仍使用 `CaptureToken` + scope）

