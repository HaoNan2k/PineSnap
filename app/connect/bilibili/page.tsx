import { createContext } from "@/server/context";
import { LearnHeader } from "@/components/learn/learn-header";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { revokeCaptureTokensByScopeAndLabel } from "@/lib/db/capture-token";
import {
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Zap,
  ShieldCheck,
  Download,
  Puzzle,
  ChevronRight,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const LABEL = "Bilibili 连接";
const TAMPERMONKEY_WEBSTORE_URL =
  "https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo";

export default async function Page() {
  const ctx = await createContext();
  const { user } = ctx;

  // 虽然 middleware 会拦截，但为了逻辑完备性，这里也做个兜底
  if (!user) {
    redirect("/login");
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
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground">
      {/* 顶部导航栏 */}
      <LearnHeader />

      <main className="flex-1 container max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-16 items-start">
          
          {/* 左侧：介绍与价值 */}
          <div className="space-y-12">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                连接 Bilibili，<br />
                让知识不再碎片化。
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                一键采集 B 站视频总结、AI 章节与字幕。将它们直接存入 PineSnap 素材库，成为你思考与创作的养料。
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">无缝嵌入</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    无需离开播放页。脚本会在页面通过极简 UI 提示，点击即可完成采集，不打断观看体验。
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">结构化入库</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    自动提取视频元数据、摘要与完整字幕，保持原始结构，为后续的 AI 对话与整理做好准备。
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-2xl bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">隐私优先</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    代码透明，按需运行。仅当你主动点击时才会读取当前页面内容，绝不进行后台监控或读取敏感数据。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：操作面板 */}
          <div className="relative">
            <div className="rounded-3xl border bg-card text-card-foreground shadow-sm overflow-hidden sticky top-28">
              
              {/* 面板头部 */}
              <div className="p-8 border-b bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${
                      isConnected 
                      ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-primary/10 text-primary"
                  }`}>
                    {isConnected ? <CheckCircle2 className="h-6 w-6" /> : <Puzzle className="h-6 w-6" />}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{isConnected ? "已连接" : "设置连接器"}</h2>
                    <p className="text-sm text-muted-foreground">
                      {isConnected ? "随时可以使用" : "只需简单两步"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                
                {!isConnected ? (
                  <div className="space-y-8">
                    {/* Step 1 */}
                    <div className="relative pl-8 before:absolute before:left-[11px] before:top-8 before:bottom-[-32px] before:w-[2px] before:bg-border last:before:hidden">
                      <div className="absolute left-0 top-1 h-6 w-6 rounded-full border-2 border-primary bg-background flex items-center justify-center text-[10px] font-bold text-primary">
                        1
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <h3 className="font-medium">安装运行环境</h3>
                          <p className="text-sm text-muted-foreground">
                            需要 Tampermonkey 扩展来运行连接器脚本。
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-9 text-xs font-medium gap-2"
                        >
                          <a
                            href={TAMPERMONKEY_WEBSTORE_URL}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            前往 Chrome Web Store 安装
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative pl-8">
                      <div className="absolute left-0 top-1 h-6 w-6 rounded-full border-2 border-primary bg-background flex items-center justify-center text-[10px] font-bold text-primary">
                        2
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h3 className="font-medium">启用连接器</h3>
                          <p className="text-sm text-muted-foreground">
                            一键安装脚本，建立与 PineSnap 的安全连接。
                          </p>
                        </div>
                        <Button
                          asChild
                          className="w-full rounded-xl h-11 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                        >
                          <a href="/connect/bilibili/install.user.js">
                            <Download className="mr-2 h-4 w-4" />
                            安装连接器脚本
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* Troubleshooting */}
                    <details className="group pt-4 border-t">
                      <summary className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>安装遇到问题？</span>
                        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground leading-relaxed space-y-2">
                        <p>如果看到“无法从该网站添加应用...”，说明浏览器未检测到 Tampermonkey。</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>请确认已完成<b>步骤 1</b>并成功安装 Tampermonkey。</li>
                          <li>安装后可能需要刷新本页面。</li>
                          <li>再次点击<b>步骤 2</b>的按钮即可。</li>
                        </ul>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20 text-sm text-green-800 dark:text-green-300">
                      连接器运行正常。请打开 B 站视频页并 <strong className="font-extrabold underline decoration-green-500/50 underline-offset-2">刷新页面</strong>，即可看到 PineSnap 图标。
                    </div>
                    
                    <div className="space-y-3">
                      <Button asChild variant="outline" className="w-full justify-start h-10">
                        <a href="/connect/bilibili/install.user.js">
                          <Download className="mr-2 h-4 w-4" />
                          重新安装 / 更新脚本
                        </a>
                      </Button>
                      <form action={disconnect}>
                        <Button
                          type="submit"
                          variant="ghost"
                          className="w-full justify-start h-10 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          断开连接
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-auto">
        <div className="container flex items-center justify-center gap-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">
          <span>PineSnap Bilibili Connector</span>
          <span className="text-border">•</span>
          <span>V0.4.3</span>
          <span className="text-border">•</span>
          <span>Powered by OpenSpec</span>
        </div>
      </footer>
    </div>
  );
}
