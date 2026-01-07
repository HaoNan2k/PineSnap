import Link from "next/link";
import { requireEnv } from "@/lib/env";
import { createContext } from "@/server/context";
import { LoginCard } from "@/components/auth/login-card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { revokeCaptureTokensByScopeAndLabel } from "@/lib/db/capture-token";
import { CheckCircle2, AlertCircle, ArrowLeft, LayoutDashboard, Zap, ShieldCheck } from "lucide-react";
import { revalidatePath } from "next/cache";

const LABEL = "Bilibili 连接";

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

  const userId = user.id;

  // Check active connection status
  const activeCount = await prisma.captureToken.count({
    where: {
      userId,
      revokedAt: null,
      label: LABEL,
      scopes: { has: "capture:bilibili" },
    },
  });

  const isConnected = activeCount > 0;

  async function disconnect() {
    "use server";
    await revokeCaptureTokensByScopeAndLabel({
      userId,
      scope: "capture:bilibili",
      label: LABEL,
    });
    revalidatePath("/connect/bilibili");
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-background flex flex-col">
      {/* 顶部导航栏：现代、通透、高质感 */}
      <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur-md sticky top-0 z-50 transition-all">
        <div className="container flex h-16 items-center max-w-5xl mx-auto px-6">
          <div className="flex items-center gap-4">
            <Link href="/chat" className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <div className="h-8 w-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black group-hover:scale-105 transition-transform shadow-sm">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span>回到主页</span>
            </Link>
            <div className="h-4 w-[1px] bg-border mx-2 hidden sm:block" />
            <div className="items-center gap-2 hidden sm:flex">
              <span className="text-sm font-semibold tracking-tight">连接器中心</span>
            </div>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border transition-all ${
              isConnected 
                ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:border-green-500/20' 
                : 'bg-muted/50 text-muted-foreground border-transparent'
            }`}>
              <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
              {isConnected ? 'Active' : 'Offline'}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-12">
          {/* 左侧内容区 */}
          <div className="space-y-10">
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Bilibili 连接</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                将 B 站视频采集工作流自动化。一键入库，让学习与整理更简单。
              </p>
            </div>

            <div className="grid gap-6">
              <div className="group rounded-2xl border bg-white dark:bg-card p-6 shadow-sm hover:shadow-md transition-all border-black/[0.03] dark:border-white/[0.03]">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">无缝采集</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      脚本会在播放页左侧生成极简的 “P” 标识，悬停即现，点击即采。不再为复制粘贴碎片化内容而烦恼。
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border bg-white dark:bg-card p-6 shadow-sm hover:shadow-md transition-all border-black/[0.03] dark:border-white/[0.03]">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <LayoutDashboard className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">直接入库</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      采集结果直接进入 PineSnap 素材库，包含视频总结、AI 章节与完整字幕，保留原始结构化信息。
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-2xl border bg-white dark:bg-card p-6 shadow-sm hover:shadow-md transition-all border-black/[0.03] dark:border-white/[0.03]">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">隐私保护</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      我们仅接收你主动触发的页面内容。PineSnap 绝不获取你的 B 站账户凭证或任何非公开数据。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧操作卡片 */}
          <div className="space-y-6">
            <div className={`rounded-3xl border p-8 space-y-6 sticky top-28 transition-all ${
              isConnected 
                ? 'bg-white border-green-100 shadow-[0_20px_50px_rgba(34,197,94,0.05)]' 
                : 'bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)]'
            }`}>
              <div className="space-y-2 text-center pb-2">
                <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center transition-transform duration-500 ${
                  isConnected ? 'bg-green-100 text-green-600 rotate-[10deg]' : 'bg-muted text-muted-foreground'
                }`}>
                  {isConnected ? <CheckCircle2 className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
                </div>
                <h2 className="text-xl font-bold pt-2">{isConnected ? '已连接成功' : '尚未连接'}</h2>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? '采集器已授权并就绪' : '请启用浏览器连接器'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {!isConnected ? (
                  <Button asChild className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-black/5 hover:shadow-black/10 transition-all active:scale-[0.98]">
                    <a href="/connect/bilibili/install.user.js">一键启用连接</a>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full h-12 rounded-xl text-md font-semibold hover:bg-muted/50 transition-all">
                      <a href="/connect/bilibili/install.user.js">重新安装 / 更新</a>
                    </Button>
                    <form action={disconnect} className="w-full">
                      <Button type="submit" variant="ghost" className="w-full h-12 rounded-xl text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 transition-all">
                        断开当前连接
                      </Button>
                    </form>
                  </>
                )}
              </div>

              <div className="pt-4 text-center">
                <p className="text-[10px] text-muted-foreground leading-relaxed px-2">
                  安装脚本需要 Tampermonkey 或类似扩展的支持。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 bg-white/50 dark:bg-transparent">
        <div className="container max-w-5xl mx-auto px-6 text-center text-xs text-muted-foreground tracking-wide uppercase font-medium flex items-center justify-center gap-4">
          <span>PineSnap Bilibili Connector</span>
          <div className="h-1 w-1 rounded-full bg-border" />
          <span>V0.4.3</span>
          <div className="h-1 w-1 rounded-full bg-border" />
          <span>Powered by OpenSpec</span>
        </div>
      </footer>
    </div>
  );
}
