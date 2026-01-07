# content-capture Specification

## Purpose

本规范定义“跨站内容采集（Userscript）”的服务端行为、鉴权与持久化约束。采集的目标是将外部页面的结构化内容写入 PineSnap 的数据库，作为后续“素材库/二次加工/对话整理”的输入。

> 说明：历史的演进过程请查看 `openspec/changes/**` 与 `openspec/changes/archive/**`。本文件仅描述当前实现应遵循的真相约束。

## Requirements

### Requirement: Capture requests MUST be authenticated by server-controlled tokens

系统 SHALL 使用服务端生成的 `CaptureToken` 进行跨站采集鉴权。

#### Scenario: Missing or invalid token is rejected
- **WHEN** `POST /api/capture/*` 请求缺少或携带无效 `Authorization: Bearer <token>`
- **THEN** 服务端 MUST 返回 401

#### Scenario: Token without required scope is rejected
- **WHEN** `POST /api/capture/*` 请求携带的 token 不包含该端点要求的 scope
- **THEN** 服务端 MUST 返回 403

### Requirement: Bilibili capture endpoint MUST persist raw payload as Resource

系统 SHALL 在接收到 B 站采集请求后创建 `Resource`，并将完整 payload 以结构化 JSON 形式写入 `Resource.content`（PostgreSQL `jsonb`）。

系统 MUST 使用如下结构化 payload，明确区分元数据、摘要与字幕，并标注提取来源（Provider）：

```typescript
type VideoCapturePayloadV1 = {
  version: 1;

  metadata: {
    platform: "bilibili";
    id?: string;        // e.g. BV1xx411c7Xh
    url: string;        // 来源 URL
    title?: string;     // 视频标题
  };

  content: {
    // 摘要/总结部分
    summary?: {
      provider: string; // e.g. "bilibili_ai_assistant_panel"
      text?: string;    // 全文总结/简介
      chapters?: Array<{
        startMs?: number;
        startLabel?: string; // e.g. "00:25"
        title: string;
      }>;
    };

    // 字幕/转录部分
    transcript?: {
      provider: string; // e.g. "bilibili_ai_assistant_panel"
      language?: string;
      lines: Array<{
        startMs?: number;
        startLabel?: string;
        text: string;
      }>;
    };
  };
};
```

#### Scenario: Persist bilibili capture as a Resource
- **WHEN** Userscript 向 `POST /api/capture/bilibili` 发送 `VideoCapturePayloadV1` 并通过鉴权
- **THEN** 服务端 MUST 创建一条 `Resource`（`type = bilibili_capture`）
- **AND** `Resource.content` MUST 存储完整 payload（不得仅存转换后的纯文本）
- **AND** 服务端 MUST 返回 `{ ok: true, resourceId: string }`

### Requirement: Capture MUST NOT create conversations implicitly

采集与对话 MUST 解耦：采集阶段仅负责入库素材，不应隐式创建 `Conversation/Message`。

#### Scenario: No conversation is created during capture
- **WHEN** 服务端处理 `POST /api/capture/bilibili` 的采集请求
- **THEN** 服务端 MUST NOT 创建 `Conversation` 或 `Message`

### Requirement: Capture endpoints MUST restrict CORS by allowlist

采集端点在开启 CORS 的同时 MUST 采用 allowlist 限制可用 origin（避免被任意站点滥用）。

#### Scenario: Only allow configured origins
- **WHEN** 请求 `Origin` 不在 allowlist 中
- **THEN** 响应 MUST NOT 包含 `access-control-allow-origin` 头

