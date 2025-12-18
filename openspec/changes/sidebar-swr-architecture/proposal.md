# Proposal: 侧边栏 SWR 架构重构

## 背景

之前的 RSC-first 架构尝试（`fix-chat-ui-message-rendering`）遇到了以下问题：

- `revalidateTag` 无法自动刷新客户端 UI（需要 `router.refresh()` 会中断流）
- 侧边栏标题更新不生效（服务端更新后客户端无感知）
- 架构复杂度高（RSC props → Context → useEffect 同步）

参考 Vercel 官方 `ai-chatbot` 模板，发现其采用的是 **SWR + API** 模式管理侧边栏数据，而非 RSC props。

## 目标

- **G1**：侧边栏会话列表使用 SWR 从 `/api/conversations` 获取数据
- **G2**：新建对话后，侧边栏实时更新（通过流式推送 + `mutate()` 触发）
- **G3**：标题更新后，侧边栏实时显示新标题
- **G4**：保留历史对话页面（`/chat/c/[id]`）的 RSC 初始加载优势

## 非目标

- 不改变聊天流式响应的实现（继续使用 `useChat`）
- 不引入完整的认证系统（继续使用 `default-user`）
- 不改变数据库 schema

## 方案概览

采用 **RSC 初始加载 + SWR 实时同步** 的混合架构：

1. **侧边栏**：使用 `useSWR('/api/conversations')` 获取会话列表
2. **历史对话页面**：保留 RSC 预取消息历史
3. **数据同步**：通过 `DataStreamHandler` 监听流式事件，调用 `mutate()` 刷新
4. **标题更新**：服务端通过 `dataStream.write({ type: "data-title_updated" })` 推送

## 参考

- `vercel/ai-chatbot`：使用 `useSWRInfinite` 获取聊天历史，通过 `mutate()` 刷新
- `vercel-labs/gemini-chatbot`：使用 `useSWR` 获取历史列表

## 风险与回滚

- **风险**：需要添加 SWR 依赖
- **回滚**：所有变更限定在 UI 层，可回滚到 stash 的 RSC 版本
