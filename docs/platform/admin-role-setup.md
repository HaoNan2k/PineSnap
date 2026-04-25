# Admin Role 设置

## 背景

PineSnap 通过 Supabase `auth.users.raw_app_meta_data.role` 字段标记 admin 用户。
非 admin 用户不能访问 `/debug` 路由组，也不能调用 `debug.*` tRPC 接口。

`app_metadata` 不可被客户端修改（只能用 service role key 写入），因此把它作为
admin 标识是安全的。

## 设置首位 admin

在 Supabase Dashboard → SQL Editor 跑下面这条 SQL：

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = '<把这里换成 admin 邮箱>';
```

## 验证

设置完成后，让该用户重新登录（让 JWT 刷新），然后在浏览器 DevTools → Application → Cookies
查看 Supabase session token，或在服务端调用 `supabase.auth.getUser()` 检查
`user.app_metadata.role === "admin"`。

## 撤销 admin

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'role'
WHERE email = '<目标邮箱>';
```

## 工作机制

- `server/context.ts:resolveUserRole()` 从 `supabase.auth.getUser()` 读
  `app_metadata.role`
- `server/trpc.ts:adminProcedure` 是 `protectedProcedure` 之上的扩展，role !== "admin"
  抛 `FORBIDDEN`
- 角色解析按需进行（只在 `adminProcedure` 调用时触发），不影响其他 procedure 的
  header fast-path 性能
