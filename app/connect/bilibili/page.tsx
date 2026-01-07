import Link from "next/link";
import { requireEnv } from "@/lib/env";
import { createContext } from "@/server/context";
import { LoginCard } from "@/components/auth/login-card";
import { Button } from "@/components/ui/button";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const ctx = await createContext();
  const { user } = ctx;
  const params = await searchParams;
  const returnUrl = "/connect/bilibili";
  const isUnauthorized = params.unauthorized === "true";

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        {isUnauthorized && (
          <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 shadow-sm max-w-md w-full text-center">
            会话已过期，请重新登录
          </div>
        )}
        <LoginCard
          supabaseUrl={requireEnv("SUPABASE_URL")}
          supabaseAnonKey={requireEnv("SUPABASE_ANON_KEY")}
          redirectTo={returnUrl}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">连接 Bilibili</h1>
        <p className="text-sm text-muted-foreground">
          连接后，你可以在 B 站视频页一键采集字幕并写入 PineSnap。
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="font-medium">这项连接能实现什么？</div>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>在 B 站视频页一键采集字幕（以页面可见内容为准）。</li>
          <li>采集结果会在 PineSnap 中创建一条新的对话，方便后续整理与学习。</li>
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="font-medium">以后要怎么操作？</div>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>如果你更换电脑/浏览器，重新来这里点一次“启用”即可。</li>
          <li>如果你怀疑泄露或不想用了，可以“断开连接”，之后采集会立刻失效。</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild>
          <a href="/connect/bilibili/install.user.js">一键启用（安装浏览器连接器）</a>
        </Button>
        <Button asChild variant="outline">
          <Link href="/connect/bilibili/manage">管理/断开连接</Link>
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        说明文档（图文版）稍后补充；目前你可以先按上述步骤完成启用。
      </div>
    </div>
  );
}

