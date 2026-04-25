# 0001 — 本地开发使用 supabase start 而非远程 DB

- 日期：2026-04-17
- 状态：accepted

## 背景

开发服务器跑在本地（中国），生产 Supabase DB 部署在 ap-southeast-1（新加坡）。Prisma 嵌套查询被拆成多条 SQL，每条走一次跨国网络往返（~500ms）。即使是简化后的查询，`learning.getState` 仍要 5+ 秒，严重影响调试迭代速度。生产环境因服务器与 DB 同区域，此问题不存在。

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| Prisma `relationJoins` 预览特性 | 改动小，多 SQL → 1 个 JOIN | 仍是预览特性，部分场景反而更慢 |
| Prisma Accelerate | 无需改应用架构，带全球缓存 | 需付费订阅才能稳定使用 |
| Drizzle ORM 替换 Prisma | 原生单 JOIN，架构彻底改进 | 重写成本高，整套 migration 和生成代码都要改 |
| **supabase start 本地栈** | 0ms 延迟，完整 stack（Auth/Storage/Realtime）一致，免费 | 首次镜像下载较慢，需要 Docker |

## 决策

采用 `supabase start` 搭建本地开发栈，生产继续使用远程 Supabase。

## 理由

- **延迟根除**：从 5 秒降到 15ms，不是"缓解"而是消除
- **生产代码零改动**：只通过 `.env.local` 切换连接串，所有代码路径与生产一致
- **官方推荐**：Supabase CLI 的本地栈是官方 dev workflow，问题有社区支持
- **离线可用**：不依赖网络稳定性

## 影响

- `.env.local` 加入 `.gitignore`，每个开发者本地独立配置
- 本地数据与远程隔离，需要时手动导入（见性能文档）
- 需要 Docker Desktop，首次启动需拉取 ~2GB 镜像
- OTP 登录邮件不真发，统一走 Mailpit（http://127.0.0.1:54324）
