# Spec: 侧边栏 UI（SWR 架构）

> 本规范描述侧边栏会话列表的 SWR 架构实现。

## Requirements

### R1: 数据获取

- 侧边栏 MUST 使用 `useSWR('/api/conversations')` 获取会话列表
- 数据 MUST 按 `updatedAt` 降序排列
- 加载状态 MUST 显示骨架屏

### R2: 分组显示

- 会话列表 MUST 按时间分组：Today / This Week / Earlier
- 每个分组 MUST 显示标题
- 空分组 SHOULD NOT 显示

### R3: 实时更新

- 新建会话后，侧边栏 MUST 在 2 秒内显示新会话
- 标题更新后，侧边栏 MUST 在 2 秒内显示新标题
- 删除会话后，侧边栏 MUST 立即移除该会话

### R4: 乐观更新

- 删除操作 SHOULD 乐观更新（先从 UI 移除，再发送请求）
- 重命名操作 SHOULD 乐观更新（先更新 UI，再发送请求）
- 操作失败时 SHOULD 回滚并显示错误提示

## Scenarios

### S1: 新对话

```
Given 用户在 /chat 页面
When 用户发送第一条消息
Then 侧边栏显示新会话（初始标题 "New Chat"）
And 标题更新后侧边栏显示新标题
```

### S2: 删除对话

```
Given 侧边栏显示会话列表
When 用户点击某会话的删除按钮并确认
Then 该会话立即从列表中移除
And 若当前正在该会话，则跳转到 /chat
```

### S3: 重命名对话

```
Given 侧边栏显示会话列表
When 用户重命名某会话
Then 新标题立即显示在列表中
```

### S4: 页面刷新

```
Given 用户在聊天页面
When 用户刷新页面
Then 侧边栏重新获取数据并显示
```
