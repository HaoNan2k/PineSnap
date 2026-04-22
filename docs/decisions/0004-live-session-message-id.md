# 0004 — Live-session 时 canvas 消息 id 的一致性契约

- 日期：2026-04-19 / 2026-04-20
- 状态：accepted
- 关联：[0003 · Canvas + Chat 架构重设计](./0003-canvas-chat-architecture.md)
- Commits：`b7ce55d`, `680c93b`

## 背景

0003 的 Light Anchor 设计要求 sidebar 提问时把"当前 canvas 最新 assistant 消息的 id"作为 anchor 发给服务端，服务端用 `prisma.message.findUnique({ where: { id: anchor } })` 校验。

落地后发现一个隐含假设没成立：**客户端 useChat 里那条消息的 `id` ≠ DB 行 `id`**。

- 客户端：AI SDK useChat 在 streaming 时给消息分配一个 16 字符 nanoid（如 `zGNdZohHYYuk7sKS`）
- 服务端：`prisma.message.create` 默认 `@default(uuid(7))`，生成 UUID v7（如 `019da229-...`）
- 两者在 live session 里永远不一致，直到用户刷新页面、消息从 DB 水合回来带上真 UUID

结果：任何 **未刷新就提问** 的 sidebar 操作，服务端 schema 校验 `anchorMessageId: z.string().uuid()` 直接 400。0003 的核心体验（canvas + sidebar 并行）在生产环境完全走不通。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| A. server 预生成 UUIDv7，stream start 事件带 `messageId`，DB 用同 id 持久化 | 客户端 useChat 自动采纳 stream 给的 messageId；DB id 和 UI id 同源；anchor 校验原路不变 | 需要改 `createMessage` 接受 `explicitId`；每 turn 只管第一条 assistant 消息的 id |
| B. 服务端 anchor 校验放宽，短 id 回退到 `clientMessageId` 查找 | 客户端不动 | 得给 canvas assistant 消息加 `clientMessageId` 列；客户端要把自己的 nanoid 回传给服务端，路径长 |
| C. stream 结束后客户端 refetch canvas 状态拿 UUID | 简单粗暴 | 会闪烁、多一次 tRPC 请求、延迟拿到 latestCanvasMessageId 带来并发窗口 |

## 决策

选 **A**：由服务端决定 assistant 消息 id，通过 UI 消息流回写给客户端。

## 理由

- AI SDK 的 UI message stream 协议本就支持 `{ type: "start", messageId: <id> }` 语义，是官方推荐写法
- 只改 4 处：`uuidv7()` 预生成、`writer.write({ type: "start", messageId })`、`createMessage` 加 `explicitId`、`onFinish` 对 turn 首条 assistant 套 explicitId
- 客户端无感知，Light Anchor 代码原样不动
- 方案 B 把"客户端 nanoid → 服务端 clientMessageId"当 id 的二级索引，引入一条并行的身份系统，长期维护成本大
- 方案 C 的刷新闪烁在学习场景里（正在 streaming 的 canvas）体验退化

## 边界情况：streaming 占位消息

useChat 收到用户 turn 后会**先在本地插一条空 parts 的 assistant 占位**（nanoid id），再等服务端 start 事件回填真 id。这之间有 ~几百毫秒窗口。如果用户在窗口里点发送，`latestCanvasMessageId` 仍会读到 nanoid。

解决：`latestCanvasMessageId` 倒序找第一条 `parts.length > 0` 的 assistant 消息，跳过占位。见 `components/learn/learn-focus.tsx:375-384`。

## 影响

- `app/api/learn/chat/route.ts`：导入 `v7 as uuidv7`，每次 POST 预生成 `assistantMessageId`，`writer.write({ type: "start", messageId: assistantMessageId })`，`onFinish` 里按 turn 首条 assistant 套 explicitId
- `lib/db/message.ts`：`createMessage` 加 optional `explicitId`，有就走 `data.id = explicitId`
- `components/learn/learn-focus.tsx`：`latestCanvasMessageId` 改为跳过空占位
- **未来依赖**：所有基于"canvas 消息 id"做校验/引用/audit 的功能都依赖这个契约。新增类似字段时复用同一条路径（server 预生成 + stream 回写 + DB 同 id）
- **回滚成本**：回滚后 live session sidebar 必 400；这条契约是 0003 能落地的前提，不能单独回滚
