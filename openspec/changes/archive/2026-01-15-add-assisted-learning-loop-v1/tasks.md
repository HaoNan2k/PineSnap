# Tasks: Assisted Learning Loop（V1）

> 说明：本 tasks 覆盖从"提案 → 实现 → 手动回归"的可验证步骤。实现阶段完成后应将对应条目勾选为 - [x]。

## 提案阶段（spec）

- [x] 创建 `openspec/changes/add-assisted-learning-loop-v1/`（proposal/design/tasks + delta spec）
- [x] `openspec validate add-assisted-learning-loop-v1 --strict` 通过

## 实现阶段（apply）

### 路由与布局

- [x] 将 `/` 默认入口调整为 `/sources`
- [x] 增加 Main 页面：
  - [x] `/sources`：展示 `Resource` 全量列表（V1 可先展示 `type=bilibili_capture`，但定义为全量）
  - [x] `/learning`：占位页（后续补设计）
  - [x] `/notes`：占位页（后续补设计）
- [x] 增加 Focus 页面：
  - [x] `/learn/[resourceId]`：Learn Focus 页面
  - [x] Focus 具备极简 Header（与设计稿一致）
- [x] 学习区域左上角具备 X 退出按钮，点击返回 `/sources`

### Learn Focus 交互（V1）

- [x] Learn 初始状态为 idle（未开始）
- [x] 用户点击 Start 后才触发生成（Start 前允许未来扩展"需求澄清"）
- [x] Learn 页面暂时只展示卡片（不展示资源原文）

### 数据

- [x] 素材列表读取 `Resource` 数据（服务端为真相源）
- [x] V1 不修改 Prisma schema；不引入学习进度/状态落库

## 手动回归清单（@Browser）

- [x] 采集链路：通过 Userscript 调用 `POST /api/capture/bilibili` 能成功落库（返回 `{ ok: true, resourceId }`）
- [x] 素材：访问 `/sources` 能看到刚采集的资源条目
- [x] 进入 Learn：从 素材 点击某条资源进入 `/learn/[resourceId]`
- [x] Focus UI：
  - [x] 顶部存在极简 Header
  - [x] 学习区域左上角存在 X
  - [x] 点击 X 返回 `/sources`
- [x] Start 行为：
  - [x] 未点击 Start 前不触发生成
  - [x] 点击 Start 后触发生成并展示第一张卡片
