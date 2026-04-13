# 设计：Bilibili 字幕轨稳定性防护（扩展端）

## 1. 设计目标

- **正确性优先**：当轨道不稳定时，宁可失败提示，也不写入明显错误字幕。
- **主流程低侵入**：仅在 `bilibili-full-subtitle` extractor 内新增防护，不改 registry 和上传契约。
- **可读可调**：采用明确的采样-判定流程，参数集中定义，便于后续调整。

## 2. 现状问题

现有流程：

1. `x/player/v2` 拉轨道；
2. 选中文轨（`ai-zh` 优先）；
3. 用 `subtitle_url` 拉正文并入库。

问题在于：

- 单次读取对上游漂移敏感；
- `subtitle_url` 可能为空；
- 轨道错映射会被直接写入 `Resource.content`。

## 3. 新流程（局部替换）

仅替换“通过 player API 取轨道”这一步，整体流程保持不变：

1. 第一次采样 `x/player/v2`，提取候选中文轨；
2. 若 `subtitle_url` 为空，进入短退避重试；
3. 第二次采样做一致性确认；
4. 若两次不一致，进入第三次仲裁采样；
5. 通过“多数票 + 可用 URL”选择稳定轨道；
6. 若无法得出稳定结果，返回 `SUBTITLE_TRACK_UNSTABLE`。

## 4. 判定规则

### 4.1 轨道主键

使用 `trackKey = <trackId>|<language>` 作为一致性投票主键。  
`subtitle_url` 不参与跨次投票，仅用于“本次是否可拉取”的可用性判定。

### 4.2 稳定判定

- 当同一 `trackKey` 样本计数 `>= 2` 且至少有一次 URL 可用时，可提前通过（早停）。
- 采样结束后按计数排序，若最高计数 `< 2`，判定不稳定并失败。
- 采样上限默认 3 次，退避间隔例如 250ms、700ms（总等待可控）。

### 4.3 失败语义

新增失败码：

- `SUBTITLE_TRACK_UNSTABLE`：轨道样本无法达成稳定一致。

## 5. 诊断字段

在 `captureDiagnostics` 新增可选字段（不破坏兼容）：

- `trackResolution`:  
  - `attemptCount`  
  - `strategy`（如 `majority_vote_v1`）  
  - `samples`（每次采样的 `trackId/language/hasUrl/signature`）  
  - `resolvedBy`（`single` / `early_consensus` / `majority` / `none`）

## 6. 对现有系统影响

- **扩展端**：`bilibili-full-subtitle.js` 增加轨道解析防护 helper。
- **UI 提示**：`content.js` 增加新错误码提示文案。
- **服务端**：无契约变更；继续原样入库。
- **数据库**：无 schema 变更。

## 7. 风险与权衡

- 代价：平均采集时延增加（最多约 1~2 秒）。
- 收益：显著降低错轨入库风险。
- 权衡：采用“最多 3 次 + 早停”而非固定高次数，控制用户等待和 B 站接口压力。

