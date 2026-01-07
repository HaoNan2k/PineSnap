# Proposal: 技术栈现代化 - 迁移至 tRPC + React Query

## 背景与动机

当前项目使用传统的 Next.js API Routes + SWR 架构，在实际使用中暴露出以下问题：

1. **类型安全缺失**：前后端类型需手动维护，修改 API 返回结构时前端无编译时检查
2. **认证逻辑分散**：每个 API Route 都要手动调用 `requireUserId()`，代码重复且易遗漏
3. **SWR 配置不当**：401 错误触发无限重试，导致界面闪烁和无效请求
4. **Session 管理缺陷**：
   - `lib/supabase/server.ts` 的 `setAll()` 为空函数，导致 Session 无法持久化
   - 缺少自动刷新机制，Token 过期后需重新登录
   - 多标签页状态不同步
5. **用户体验不佳**：缺少友好的用户菜单、Toast 通知、错误处理

## 目标

将项目升级到 2025 年业界标准的现代化技术栈，达到以下目标：

1. **端到端类型安全**：通过 tRPC 实现前后端类型自动同步
2. **统一认证网关**：通过 Next.js Middleware 统一处理认证
3. **完善的数据管理**：使用 React Query 替代 SWR，提供更强大的缓存和状态管理
4. **健壮的 Session 管理**：修复 Cookie 写入、实现自动刷新、支持多标签页同步
5. **现代化用户体验**：右上角用户菜单、Toast 通知、优雅的错误处理

## 非目标

- 不改变现有的聊天功能逻辑（消息流式、历史加载等）
- 不改变数据库 schema
- 不改变路由结构（`/chat` 和 `/chat/c/[id]`）
- 不引入不必要的兼容性代码（完全迁移，不保留旧方案）

## 范围

### 新增 Capability
- **auth**：认证与授权系统（Middleware、Auth Context、Session 管理）

### 修改 Capability
- **chat-conversation**：API 层迁移到 tRPC
- **chat-ui**：添加用户菜单、Auth Context 集成、Toast 通知

### 技术栈变更
- 新增：`@trpc/server`、`@trpc/client`、`@trpc/react-query`、`@trpc/next`、`@tanstack/react-query`、`sonner`
- 移除：`swr`（完全替换为 React Query）
- 保持：Next.js 16、React 19、Prisma、Supabase Auth

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 学习曲线陡峭 | 中 | 提供完整的迁移指南和示例代码 |
| 破坏性变更 | 高 | 项目未上线，可以完全重构 |
| 依赖体积增加 | 低 | 新增约 80KB（gzipped 18KB），可接受 |

## 成功标准

1. ✅ 所有 API Routes 迁移到 tRPC Procedures
2. ✅ 前端所有 `useSWR` 替换为 `trpc.*.useQuery/useMutation`
3. ✅ Middleware 统一处理认证，无 401 循环请求
4. ✅ Session 自动刷新，多标签页状态同步
5. ✅ 右上角用户菜单可用，登出流程完整
6. ✅ `openspec validate --all --strict` 通过
7. ✅ 手动回归测试通过（新对话、历史会话、侧边栏刷新）

## 参考项目

- [Cal.com](https://github.com/calcom/cal.com) - tRPC + React Query 企业级应用
- [Dub.sh](https://github.com/dubinc/dub) - 现代化全栈架构
- [T3 Stack](https://create.t3.gg/) - Next.js + tRPC 标准栈

