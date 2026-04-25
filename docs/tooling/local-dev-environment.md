# 本地开发环境

## 访问域名

- **主站**：`http://pinesnap.test:3000`
- **Artifact 子域**：`http://artifact.pinesnap.test:3000`（同一个 Next.js dev server，靠 Host 头区分路由行为）
- **不要用** `http://localhost:3000` —— 会绕开域名相关的逻辑（cookie scope、CORS、Supabase redirect 校验等）

## 系统配置

`/etc/hosts` 必须有：

```
127.0.0.1 pinesnap.test artifact.pinesnap.test
```

这是手动配置，不通过 mkcert / Caddy / nginx 反代——dev server 直接听 :3000，浏览器靠 hosts 解析。

## 协议与端口

| 协议 | 端口 | 说明 |
|-----|-----|------|
| HTTP | 3000 | Next.js dev server |
| HTTPS | — | 本地不开 HTTPS（`.test` TLD 是 RFC 6761 保留，Chrome 不强制 HTTPS） |

## 为什么不用 localhost

- **Cookie 域名一致性**：Supabase auth cookie 设到 `pinesnap.test` domain；`localhost` 拿不到 session
- **跨子域调试**：`artifact.pinesnap.test` 和 `pinesnap.test` 共享根域，方便测试 capture worker 上传/读取 artifact 的鉴权流
- **更接近线上**：domain 行为（包括 SameSite cookie、CORS preflight、CSP）与生产更一致

## 启动

```bash
pnpm dev   # 默认 3000 端口；浏览器开 http://pinesnap.test:3000
```

## 常见坑

- 如果 `pinesnap.test` 解析失败 → 检查 `/etc/hosts`（DNS 缓存可能要 `dscacheutil -flushcache` on macOS）
- 如果 Supabase OTP 邮件链接跳到 localhost → 检查 Supabase 项目 dashboard 的 Site URL / Redirect URLs，本地开发应配 `http://pinesnap.test:3000`
- 如果 capture 扩展上传到 artifact 子域失败 → 确认 `artifact.pinesnap.test` 也在 hosts 里
