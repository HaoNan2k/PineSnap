import { createContext } from "@/server/context";
import { LearnHeader } from "@/components/learn/learn-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { revokeCaptureTokensByLabel } from "@/lib/db/capture-token";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Puzzle,
  ExternalLink,
  Link2,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// 历史 label "Bilibili 扩展"（capture:bilibili 单 scope）+ 新 label "PineSnap Capture 扩展"（capture:* 通配符）。
// "已连接" 检查与 disconnect 都把两者一起算。
const EXTENSION_LABELS = ["PineSnap Capture 扩展", "Bilibili 扩展"];
const CHROME_EXTENSION_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL?.trim() || null;

export default async function Page() {
  const ctx = await createContext();
  const { user } = ctx;

  // 虽然 middleware 会拦截，但为了逻辑完备性，这里也做个兜底
  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  const activeCount = await prisma.captureToken.count({
    where: {
      userId,
      revokedAt: null,
      label: { in: EXTENSION_LABELS },
    },
  });

  const isConnected = activeCount > 0;

  async function disconnect() {
    "use server";

    for (const label of EXTENSION_LABELS) {
      await revokeCaptureTokensByLabel({ userId, label });
    }
    revalidatePath("/connect/bilibili");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      <LearnHeader />

      <main className="flex-1 container max-w-5xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-12 items-start">
          <div className="space-y-8">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              连接 Chrome 扩展，
              <br />
              一键采集 B 站内容。
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
              PineSnap 现已切换为扩展优先连接。你无需安装油猴脚本，也无需手动复制
              Token。完成连接后，在 B 站页面点击“存入 PineSnap”即可入库。
            </p>
            <div className="space-y-5">
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Puzzle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">步骤 1：安装扩展</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    前往 Chrome Web Store 安装 PineSnap Bilibili Capture 扩展。
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Link2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">步骤 2：在扩展中点击「连接 PineSnap」</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    扩展会打开授权页。确认授权后将自动完成连接，不需要手工配置 token。
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">步骤 3：回到 B 站采集</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    打开任意 B 站视频页并刷新，点击页面上的“存入 PineSnap”完成采集。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card shadow-sm overflow-hidden sticky top-24">
            <div className="p-7 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                    isConnected
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {isConnected ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Puzzle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {isConnected ? "已连接" : "等待连接"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isConnected ? "扩展可直接采集" : "完成下方操作即可开始使用"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-7 space-y-3">
              {CHROME_EXTENSION_STORE_URL ? (
                <Button asChild className="w-full h-11 rounded-xl font-bold">
                  <a href={CHROME_EXTENSION_STORE_URL} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    安装 Chrome 扩展
                  </a>
                </Button>
              ) : (
                <Button disabled className="w-full h-11 rounded-xl font-bold">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  安装 Chrome 扩展（暂未配置商店链接）
                </Button>
              )}

              <Button asChild variant="outline" className="w-full h-11 rounded-xl">
                <a href="chrome://extensions">打开扩展管理页</a>
              </Button>

              {isConnected ? (
                <p className="text-xs text-green-700 dark:text-green-400 pt-2">
                  连接正常。请在扩展设置中确认目标 PineSnap 地址后开始采集。
                </p>
              ) : (
                <p className="text-xs text-muted-foreground pt-2">
                  尚未连接时，扩展会在采集时自动引导你完成授权。
                </p>
              )}

              {!CHROME_EXTENSION_STORE_URL ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  当前环境未设置扩展商店地址，请联系管理员配置
                  `NEXT_PUBLIC_CHROME_EXTENSION_STORE_URL`。
                </p>
              ) : null}

              <form action={disconnect} className="pt-2">
                <Button
                  type="submit"
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  撤销连接
                </Button>
              </form>

            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-auto">
        <div className="container flex items-center justify-center gap-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">
          <span>PineSnap Bilibili Connector</span>
          <span className="text-border">•</span>
          <span>V0.5.0</span>
          <span className="text-border">•</span>
          <span>Powered by OpenSpec</span>
        </div>
      </footer>
    </div>
  );
}
