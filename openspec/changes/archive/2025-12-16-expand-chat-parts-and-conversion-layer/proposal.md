# Proposal: 扩展 ChatPart 并引入统一转换层

## 背景
当前 `ChatPart` 仅支持 `text` 和简化的 `file`（仅元信息），且“DB <-> Model <-> UI”的转换逻辑散落在 `route.ts` 和 `utils.ts` 中。
为了支持“Tool Call/Result 全量落库”以及“File/Image 进入模型上下文”，我们需要：
1. 扩展 `ChatPart` 语义，覆盖 Tool 与 File Ref。
2. 引入统一的 `Converter` 层，收敛各层对象之间的转换逻辑。

## 目标
- **ChatPart 扩展**：支持 `text`, `file` (带 ref), `tool-call`, `tool-result` (全量)。
- **转换层收敛**：
  - `toModelMessage(dbMessage)`: 负责把 file ref 转 URL/content，把 tool parts 转标准结构。
  - `toDbParts(aiStreamOutput)`: 负责把模型输出（含 tool）转回持久化结构。
  - `toUIParts(dbParts)`: 负责把持久化结构转回 UI 渲染用结构。
- **文件存储策略**：明确 DB 存 ref，文件内容不进 DB。

## 范围
- `lib/chat/types.ts`: 类型定义升级。
- `lib/chat/converter.ts`: 新增转换逻辑。
- `app/api/chat/route.ts`: 接入转换层，移除散落逻辑。

