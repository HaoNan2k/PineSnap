import Link from "next/link";
import { requireEnv } from "@/lib/env";
import { createContext } from "@/server/context";
import { LoginCard } from "@/components/auth/login-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { revokeCaptureTokensByScopeAndLabel } from "@/lib/db/capture-token";

const LABEL = "Bilibili 连接";

export default async function Page() {
  const ctx = await createContext();
  const { user } = ctx;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoginCard
          supabaseUrl={requireEnv("SUPABASE_URL")}
          supabaseAnonKey={requireEnv("SUPABASE_ANON_KEY")}
          redirectTo="/connect/bilibili/manage"
        />
      </div>
    );
  }

  const userId = user.id;

  const activeCount = await prisma.captureToken.count({
    where: {
      userId,
      revokedAt: null,
      label: LABEL,
      scopes: { has: "capture:bilibili" },
    },
  });

  async function disconnect() {
    "use server";
    await revokeCaptureTokensByScopeAndLabel({
      userId,
      scope: "capture:bilibili",
      label: LABEL,
    });
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">管理连接</h1>
        <p className="text-sm text-muted-foreground">
          你可以在这里断开连接。断开后，B 站侧的采集会立刻失效。
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-2">
        <div className="text-sm">
          当前状态：{activeCount > 0 ? "已连接" : "未连接"}
        </div>
        <div className="text-xs text-muted-foreground">
          已连接表示存在可用授权（用于从 B 站页面把采集内容写入 PineSnap）。
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action={disconnect}>
          <Button type="submit" variant="destructive" disabled={activeCount === 0}>
            断开连接
          </Button>
        </form>
        <Button asChild variant="outline">
          <Link href="/connect/bilibili">返回</Link>
        </Button>
      </div>
    </div>
  );
}

