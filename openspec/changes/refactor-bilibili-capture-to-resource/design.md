# refactor-bilibili-capture-to-resource Design

## 核心思路

将 B 站采集从“写入对话（Conversation/Message）”改为“写入素材（Resource）”，以便：

- 保留原始结构化信息（便于后续索引/去重/二次加工）
- 采集流程不再强制进入聊天（用户可先收集再整理）
- 极简交互：合并连接与管理流程至单一页面，移除所有多余跳转

## 数据模型（Resource）

新增 `Resource`，作为采集内容的结构化存储载体：

- `id`: String（UUIDv7，应用侧生成）
- `userId`: String（owner，由服务端鉴权确定）
- `type`: String（来源类型，例如 `bilibili_capture`）
- `title`: String（素材标题，例如从视频标题派生）
- `externalId`: String?（外部唯一标识，用于去重；例如 `BV...` 或 `BV...#p=2`）
- `content`: Json（完整存储 `VideoCapturePayloadV1`）
- `createdAt`: DateTime

## 交互设计（极简）

### 连接页面 (`/connect/bilibili`)
- 采用 **状态驱动** 的单页设计：
  - **未连接**：显示功能价值说明 + “一键启用”按钮。
  - **已连接**：显示“✅ 已连接成功”状态 + “更新连接（重新安装）” + “断开连接”按钮。
- 移除原有的 `/connect/bilibili/manage` 冗余路径。

### Userscript 行为
- 浮动按钮移至 **页面左侧**（避开右侧原生干扰）。
- 成功后仅 Toast 提示“已存入素材库”。
- 移除所有自动打开页面或复制 ID 的高侵入行为。

## API 契约

### `POST /api/capture/bilibili`

- **鉴权**：`Authorization: Bearer <token>`，token MUST 具备 `capture:bilibili` scope
- **CORS**：仅允许 `https://www.bilibili.com` origin
- **请求体**：沿用 v1 payload（`VideoCapturePayloadV1`）
- **行为**：
  - 服务端 MUST 创建 `Resource`（`type = bilibili_capture`）
  - `content` MUST 存储完整 payload
  - 服务端 MUST NOT 在采集阶段创建对话/消息
- **响应**：`{ ok: true, resourceId: string }`
