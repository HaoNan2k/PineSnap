# Logger 使用指南

项目的统一日志系统，仅用于服务端（标记为 `server-only`）。

## 特性

- ✅ **三个日志级别**：INFO、WARN、ERROR
- ✅ **开发环境彩色输出**：更易读的终端日志
- ✅ **生产环境纯文本**：适合 Vercel 等平台的日志收集
- ✅ **结构化上下文**：支持传入对象作为上下文信息
- ✅ **自动错误序列化**：包含堆栈跟踪
- ✅ **ISO 8601 时间戳**：标准化时间格式

## API

### `logInfo(message, context?)`

记录信息性日志（开发调试、请求日志等）

```typescript
import { logInfo } from "@/lib/logger";

logInfo("Server started successfully");
logInfo("User authenticated", { 
  userId: "user-123", 
  email: "test@example.com" 
});
```

**输出示例（开发环境）**：
```
2025-12-25T14:12:54.540Z INFO  Server started successfully
2025-12-25T14:12:54.541Z INFO  User authenticated | {"userId":"user-123","email":"test@example.com"}
```

### `logWarn(message, contextOrError?)`

记录警告日志（可恢复的问题、过时用法等）

```typescript
import { logWarn } from "@/lib/logger";

logWarn("API rate limit approaching", { current: 950, limit: 1000 });
logWarn("Deprecated API usage detected");
```

**输出示例（开发环境）**：
```
2025-12-25T14:12:54.541Z WARN  API rate limit approaching | {"current":950,"limit":1000}
```

### `logError(message, error?)`

记录错误日志（不可恢复的失败、异常等）

```typescript
import { logError } from "@/lib/logger";

try {
  await riskyOperation();
} catch (error) {
  logError("Failed to process request", error);
}

// 或传入上下文对象
logError("Unexpected error", { 
  requestId: "req-456",
  path: "/api/chat",
  statusCode: 500
});
```

**输出示例（开发环境）**：
```
2025-12-25T14:12:54.541Z ERROR Failed to process request | Error: Connection timeout
Error: Connection timeout
    at <anonymous> (...)
    ...
```

## 使用场景

### ✅ 应该使用 Logger 的场景

- API 路由的错误处理
- 数据库操作失败
- 外部服务调用失败
- 权限检查失败
- 重要的业务逻辑节点（如会话创建、消息持久化）

### ❌ 不应该使用 Logger 的场景

- 客户端组件（logger 是 `server-only`，客户端请继续使用 `console.*`）
- 过于频繁的调试信息（会影响性能）
- 敏感信息（密码、token 等）

## 与 Vercel 部署的兼容性

- **stdout（INFO）** → Vercel 日志（普通级别）
- **stderr（WARN/ERROR）** → Vercel 日志（错误级别）
- 生产环境自动禁用颜色，输出纯文本
- 日志格式与 Vercel Dashboard 完美兼容

## 迁移指南

项目中所有服务端 API 的 `console.error` 已统一替换为 `logError`：

```diff
- console.error("Upload failed:", error);
+ logError("Upload failed", error);
```

客户端组件保持使用 `console.*`（因为 logger 无法在浏览器环境使用）。

