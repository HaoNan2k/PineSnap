# 2026-04-19 · 019bdc0c learning 卡死会话脏数据清理

## 背景

learning `019bdc0c-7200-740d-a379-c54608afc009`（conversation `019bdc0c-8207-77ba-9914-44409c64c36f`）在新架构上线前是一条**末尾孤立**的 canvas conversation：assistant 用纯 text 追问、用户在旧 chat drawer 里答了 8 字 text 回复，AI 没生成下一步 → 末尾两条 message（`role=assistant text + role=user text`）让 canvas 渲染卡在骨架屏。

完整调查见 [docs/decisions/0002](../decisions/0002-canvas-conversation-recovery-strategy.md)。

新架构（[docs/decisions/0003](../decisions/0003-canvas-chat-architecture.md)）禁止 canvas 中的纯 text assistant 步骤，且 chat 走独立 endpoint。但**这条历史会话的尾巴不会自动消失**。本文档记录一次性手写 SQL 清理。

## 不写工具的理由

[outside voice review](../decisions/0003-canvas-chat-architecture.md) 后从工具化降级为手写 SQL：
1. 已知脏数据只有这 1 条（团队内开发期产物）
2. 工具脚本扫描会撞上活跃用户的写入（误删风险）
3. 真出现 2+ 条同类脏数据再讨论自动化

## 待清理的精确 message

通过 `pnpm tsx inspect-learning.ts`（本地脚本，已删除）确认末尾结构：

| index | role | clientMessageId | 内容摘要 |
|-------|------|----------------|---------|
| ... | ... | ... | 正常 |
| 11 | assistant | - | tool-call(renderSocraticBranch) |
| 12 | tool | tool:call_XqR6LFPgtPS7GSKpi7PkA1Jp:p9AcX | tool-result(renderSocraticBranch) ← 用户答了"是" |
| **13** | **assistant** | - | text "你能用一句话说明：RLS 到底'限制的对象'是什么..." ← 脏 |
| **14** | **user** | drgWvzqBy78JZPi7 | text(8c) ← 脏（chat 风格回复） |

清理范围：软删除 [13]、[14] 两条 message。保留 [12] 之前的所有内容。清理后：会话末尾是一条完整的 socratic 步骤（assistant tool-call + tool result），canvas 能继续推进。

## 执行步骤

### 1. 先 dry-run 确认目标

连接到生产 Postgres（pooler 或直连均可）：

```sql
SELECT
  id,
  "createdAt",
  role,
  "clientMessageId",
  jsonb_pretty(parts::jsonb) AS parts_preview,
  "deletedAt"
FROM "Message"
WHERE "conversationId" = '019bdc0c-8207-77ba-9914-44409c64c36f'
  AND "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 5;
```

**预期看到**：top 1 是 user 消息（cmi=`drgWvzqBy78JZPi7`），top 2 是 assistant text 消息。如果看到的不是这个形态，**STOP** 并重新分析（数据在期间被改动过）。

### 2. 软删除

```sql
BEGIN;

UPDATE "Message"
SET "deletedAt" = now()
WHERE "conversationId" = '019bdc0c-8207-77ba-9914-44409c64c36f'
  AND id IN (
    SELECT id FROM "Message"
    WHERE "conversationId" = '019bdc0c-8207-77ba-9914-44409c64c36f'
      AND "deletedAt" IS NULL
    ORDER BY "createdAt" DESC
    LIMIT 2
  );

-- 确认影响行数 == 2
SELECT COUNT(*) FROM "Message"
WHERE "conversationId" = '019bdc0c-8207-77ba-9914-44409c64c36f'
  AND "deletedAt" >= now() - interval '1 minute';

-- 影响行数对再 commit；不对就 ROLLBACK
COMMIT;
```

### 3. 验证

1. 浏览器打开 `/learn/019bdc0c-7200-740d-a379-c54608afc009`（生产 URL，如果可登录）
2. canvas 应该显示**最近一次 Socratic 题**（不是骨架屏）
3. 用户的"是"答案应在 quiz widget 里高亮显示
4. 顶部进度条应反映当前位置
5. 右侧 sidebar 默认收起（窄条）

### 4. 回滚（如发现误删）

```sql
UPDATE "Message"
SET "deletedAt" = NULL
WHERE "conversationId" = '019bdc0c-8207-77ba-9914-44409c64c36f'
  AND "deletedAt" >= '<timestamp from step 2>'
  AND "deletedAt" <= '<timestamp from step 2 + 1 minute>';
```

把 `<timestamp>` 替换为 step 2 软删时的实际时间（精确到分钟即可）。

## 监控

日后有第 2、3 条同类脏数据出现：
- 看 canvas conversation 末尾是 user/tool 角色 + 之后无 assistant 的会话计数
- 阈值：> 5 条 / 周 → 重新讨论是否值得做工具化清理脚本

记录人：—  
执行时间：—（待执行）  
执行结果：—
