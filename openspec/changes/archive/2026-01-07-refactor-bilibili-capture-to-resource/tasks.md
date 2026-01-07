# refactor-bilibili-capture-to-resource Tasks

- [x] 创建并完善 OpenSpec：proposal/design/specs（本目录）并通过 `openspec validate refactor-bilibili-capture-to-resource --strict`
- [x] 新增 `Resource` Prisma 模型与 migration（jsonb 存储 raw payload）
- [x] 更新 `POST /api/capture/bilibili`：由创建 `Conversation/Message` 改为创建 `Resource` 并返回 `resourceId`
- [x] 更新 Userscript：移除自动跳转，将按钮移至左侧，仅提示“已存入素材库”
- [x] 整合并简化连接页面：合并连接与管理页至单页 `/connect/bilibili`，实时显示连接状态
- [x] 更新文档：不再描述“会创建对话/跳转”
