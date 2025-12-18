# Tasks: sidebar-swr-architecture

> 目标：将侧边栏从 RSC props 模式迁移到 SWR 模式，参考 `vercel/ai-chatbot`。

## 核心参考约定 (Reference: ai-chatbot)

在实施过程中，必须对标 `vercel/ai-chatbot` 的以下实现：
1. **数据分组逻辑**：参考其 `lib/utils.ts` 中的时间分组算法。
2. **乐观更新模式**：参考其在删除和重命名会话时的 `mutate(key, ..., { optimisticData })` 用法。
3. **数据流监听**：参考其 `components/data-stream-handler.tsx` 对服务端 `dataStream` 的消费方式。
4. **API 设计**：`/api/conversations` 的响应结构应与 `ai-chatbot` 的 `Chat` 类型保持兼容，以便复用 UI 组件。

## 阶段 1：准备工作

- [x] 1.1 安装 SWR 依赖：`pnpm add swr`
- [x] 1.2 确认 `/api/conversations` API 路由已存在且返回正确格式

## 阶段 2：移除旧架构

- [x] 2.1 删除 `components/chat/sidebar/SidebarProvider.tsx`
- [x] 2.2 简化 `app/chat/layout.tsx`（移除 RSC 数据获取和 SidebarProvider）
- [x] 2.3 清理 `useConversations.ts` 中对 Context 的依赖

## 阶段 3：创建新组件

- [x] 3.1 创建 `components/sidebar/SidebarHistory.tsx`
  - [x] 使用 `useSWR('/api/conversations')` 获取数据
  - [x] 实现分组逻辑（Today / This Week / Earlier）
  - [x] 实现删除/重命名的乐观更新

- [x] 3.2 创建 `components/data-stream-provider.tsx`
  - [x] 提供 dataStream 状态的 Context

- [x] 3.3 创建 `components/data-stream-handler.tsx`
  - [x] 监听 `data-titleUpdated` 事件
  - [x] 调用 `mutate('/api/conversations')` 刷新

## 阶段 4：服务端适配

- [x] 4.1 修改 `app/api/chat/route.ts`
  - [x] 添加 `data-titleUpdated` 流式推送
  - [x] 统一命名为 camelCase (conversationId, titleUpdated)

- [x] 4.2 确认 `/api/conversations` API 返回格式
  - [x] 包含 `id`, `title`, `updatedAt`, `createdAt`

## 阶段 5：集成与验证

- [x] 5.1 更新 `ChatArea.tsx`
  - [x] 移除对 SidebarContext 的依赖
  - [x] 集成 useDataStream hook
  - [x] 通过 DataStreamHandler 触发刷新

- [x] 5.2 更新 `ChatLayoutWrapper.tsx`
  - [x] 使用新的 `SidebarHistory` 组件
  - [x] 集成 DataStreamProvider

- [x] 5.3 验证路径
  - [x] 新对话：发送消息 → 侧边栏显示新会话
  - [x] 历史对话：追加消息 → 侧边栏排序更新
  - [x] 删除对话：侧边栏立即移除
  - [x] 重命名对话：侧边栏显示新标题
  - [x] 新建聊天：从会话页面点击"新建聊天"，界面完全重置

## 阶段 6：清理

- [x] 6.1 删除不再使用的代码
  - [x] `useConversations` hook
  - [x] `Sidebar.tsx` (被 SidebarHistory.tsx 替代)

- [x] 6.2 更新类型定义
  - [x] 确保 `Conversation` 类型与 API 响应一致
  - [x] 所有类型安全，无 any 使用

## 附加改进

- [x] 统一数据流命名为 camelCase (conversationId, titleUpdated)
- [x] 新对话页面使用动态 UUID 作为 key，与 ai-chatbot 保持一致
- [x] 历史对话页面使用会话 ID 作为 key，确保组件正确重置
- [x] 添加空消息过滤和附件校验（过滤 data: URL）
- [x] 中文化 UI 文案（新对话、复制、已复制等）
- [x] 优化 DataStreamHandler 批量更新性能
- [x] 重命名 isJsonValue → isJsonObject 提高语义清晰度

## 实施总结

✅ **构建状态**：TypeScript 类型检查通过，无错误
✅ **功能验证**：所有关键路径测试通过
✅ **代码质量**：遵循项目规范，无 any 使用，代码简洁
✅ **参考标准**：严格对标 vercel/ai-chatbot 实现模式
