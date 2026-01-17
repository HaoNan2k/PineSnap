# 学习模块首屏优化与鉴权下沉（Tasks）

- [x] 确认 tRPC 契约：新增 `learning.getState` 的请求/响应结构与错误码
- [x] 更新 Middleware：覆盖 `/api/learn/:path*` 并返回 401 JSON
- [x] 添加鉴权复用：API 端优先读取 Middleware 透传的 `userId`
- [x] 学习页 SSR 改为壳渲染：移除 `createContext` 与 DB 查询
- [x] 客户端加载状态：新增 `learning.getState` 拉取与 Skeleton/错误态
- [x] tRPC 客户端全局错误处理：`UNAUTHORIZED` 渲染 `LoginCard`
- [ ] 校验学习流程：澄清 → Plan → 互动对话路径不变
- [ ] 手动回归路径：
  - [ ] 未登录访问 `/learn/[learningId]`：SSR 不阻塞，tRPC 返回 UNAUTHORIZED
  - [ ] 登录访问 `/learn/[learningId]`：首屏壳快速展示，数据后续填充
  - [ ] `learning.generateClarify`、`learning.generatePlan` tRPC 行为正常
  - [ ] `/api/learn/chat` 流式接口行为不变
