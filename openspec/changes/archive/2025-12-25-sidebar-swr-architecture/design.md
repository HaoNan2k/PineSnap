# Design: 侧边栏 SWR 架构

## 架构对比

### 旧方案（RSC-first，已废弃）

```
app/chat/layout.tsx (RSC)
    │
    └─► getUserConversations()
            │
            └─► SidebarProvider (Context)
                    │
                    └─► useEffect 同步 props
                            │
                            └─► 乐观更新函数
```

**问题**：`revalidateTag` 无法自动刷新客户端，需要 `router.refresh()` 会中断流。

### 新方案（SWR）

```
SidebarHistory.tsx (Client Component)
    │
    └─► useSWR('/api/conversations')
            │
            └─► 任何地方调用 mutate(key) 都能刷新
```

**优点**：简洁，无 Context 层，SWR 全局缓存自动共享状态。

## 设计决策

| 决策点 | 选择 | 理由 |
| :--- | :--- | :--- |
| 侧边栏数据获取 | SWR | 支持 `mutate()` 实时刷新，无需 Context |
| 历史对话页面 | RSC | 首屏速度快，SEO 友好 |
| 标题更新通知 | 流式推送 | 不中断聊天流 |
| SidebarProvider | 删除（数据管理版本） | 改用 SWR 全局缓存 |

## 组件架构

### 1. app/chat/layout.tsx

简化为仅提供布局容器：

```tsx
export default function ChatLayout({ children }) {
  return (
    <DataStreamProvider>
      <ChatLayoutWrapper>{children}</ChatLayoutWrapper>
    </DataStreamProvider>
  );
}
```

### 2. SidebarHistory.tsx（新建）

参考 `ai-chatbot/components/sidebar-history.tsx`：

```tsx
"use client";

export function SidebarHistory() {
  const { data: conversations, isLoading, mutate } = useSWR(
    '/api/conversations',
    fetcher
  );

  // 分组逻辑
  const groups = useMemo(() => groupByRecency(conversations ?? []), [conversations]);

  // ... 渲染
}
```

### 3. DataStreamHandler.tsx（新建）

监听流式事件，触发 SWR 刷新：

```tsx
"use client";

export function DataStreamHandler() {
  const { dataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    for (const delta of dataStream) {
      if (delta.type === "data-title_updated") {
        mutate('/api/conversations');
      }
    }
  }, [dataStream, mutate]);

  return null;
}
```

### 4. route.ts（修改）

添加标题更新的流式推送：

```tsx
if (text.length > 0) {
  const title = text.slice(0, 30);
  await updateConversationTitle(id, userId, title);
  writer.write({
    type: "data-title_updated",
    data: { id, title },
  });
}
```

## 数据流

```
用户发送消息
    │
    ├─► ChatArea: useChat.sendMessage()
    │
    ├─► route.ts: 创建会话 + 更新标题
    │       │
    │       └─► dataStream.write({ type: "data-title_updated" })
    │
    └─► DataStreamHandler: 监听到事件
            │
            └─► mutate('/api/conversations')
                    │
                    └─► SidebarHistory: SWR 重新获取数据
                            │
                            └─► UI 刷新
```

## 可验证路径

- **A1**：新对话 → 发送消息 → 侧边栏立即显示新会话（标题更新）
- **A2**：历史对话 → 追加消息 → 侧边栏排序更新
- **A3**：删除对话 → 侧边栏立即移除
- **A4**：重命名对话 → 侧边栏立即显示新标题



