# Design: UI Refactor for Structured Messages & Modern Input

## 1. Data Model Changes

### Frontend Message Interface
当前 `components/chat/types/chat.ts` 中的 `Message` 过于简单，需要扩展以支持 Vercel AI SDK 的结构。

```typescript
// Before
export interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

// After
export type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'file'; fileId?: string; url?: string; name?: string; contentType?: string };

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // 兼容性保留，作为 parts 的文本合并
  parts?: MessagePart[]; // 新增结构化数据
  createdAt: Date;
}
```

## 2. Component Updates

### ChatArea (Controller)
- **Mapping Logic**: 不再将 `parts` 拍平为字符串。
- **Props**: 向 `MessageList` 传递完整的结构化 `Message[]`。

### MessageItem (View)
布局调整为垂直堆叠：
1. **Header** (Optional): Role / Avatar (AI only)
2. **Text Bubble**: 仅渲染 `parts.filter(type === 'text')`。
3. **Attachments Area**: 渲染 `parts.filter(type === 'file')`，位于气泡下方，紧贴气泡。

```jsx
<div className="flex flex-col gap-2">
  {/* Text Bubble */}
  {hasText && <div className="bubble">...</div>}
  
  {/* File Attachments */}
  {hasFiles && (
    <div className="flex flex-wrap gap-2">
      {files.map(f => <FileCard file={f} />)}
    </div>
  )}
</div>
```

### MultimodalInput (View)
- **Container**: `bg-white`, `rounded-2xl`, `shadow-sm`, `border-gray-200` (hover: `gray-300`).
- **Textarea**: 去除所有默认边框，背景透明。
- **Actions**: 将文件上传与发送按钮布局优化，确保视觉平衡。

## 3. Visual Style Guide (Target: v0-like)

- **Colors**:
  - Background: White / Gray-50
  - User Bubble: Black (`bg-gray-900`) or Brand Blue (`bg-blue-600`) -> decided: **Black/Dark Gray** for "pro" feel (matching v0).
  - Assistant Text: Normal text color, no background bubble (or very subtle).
- **Typography**: Inter / Sans-serif, optimized for reading.
- **Spacing**: Comfortable padding (p-4), rounded corners (rounded-2xl).
