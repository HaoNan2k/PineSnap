import { LoginCard } from "@/components/auth/login-card";
import { requireEnv } from "@/lib/env";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "登录 - PineSnap",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const returnUrl = typeof params.returnUrl === "string" ? params.returnUrl : "/chat";

  return (
    <main className="min-h-screen w-full flex bg-background overflow-hidden">
      {/* 左侧：品牌展示区 (Desktop only) - 黄金分割比例 38.2% */}
      <div className="hidden lg:flex lg:w-[38.2%] min-w-[480px] bg-[#1a4a35] flex-col justify-between p-12 xl:p-16 relative overflow-hidden text-white shrink-0">
        {/* 背景光效 */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[60%] bg-[#2a6a4d] rounded-full blur-[120px] opacity-60 pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-[#0f3324] rounded-full blur-[100px] opacity-80 pointer-events-none" />
        
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative h-10 w-10">
             {/* 使用 filter 将 svg 变为白色 */}
            <Image 
              src="/brand-icon.svg" 
              alt="PineSnap Logo" 
              fill
              className="object-contain brightness-0 invert"
            />
          </div>
          <span className="font-serif text-2xl font-semibold tracking-tight">PineSnap</span>
        </div>

        {/* Slogan */}
        <div className="relative z-10 space-y-6">
          <h1 className="font-serif text-5xl xl:text-6xl font-bold leading-tight tracking-tight">
            不止收藏
          </h1>
          <div className="w-12 h-1 bg-white/20 rounded-full" />
          <p className="text-lg xl:text-xl text-white/80 font-light leading-relaxed max-w-sm">
            囤积是本能，<br/>
            消化是成长。
          </p>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-white/40 font-medium tracking-wider uppercase">
          © 2026 PineSnap Inc.
        </div>
      </div>

      {/* 右侧：登录表单区 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md animate-in fade-in duration-700 slide-in-from-bottom-4 flex flex-col items-center">
          <Suspense fallback={<div className="h-[400px] w-full animate-pulse bg-gray-50 rounded-xl" />}>
            <LoginCard
              supabaseUrl={requireEnv("SUPABASE_URL")}
              supabaseAnonKey={requireEnv("SUPABASE_ANON_KEY")}
              redirectTo={returnUrl}
            />
          </Suspense>

          {/* 服务条款声明 */}
          <p className="mt-8 text-xs text-muted-foreground/60 text-center leading-relaxed">
            继续即表示您同意我们的
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline mx-1 transition-colors">
              服务条款
            </Link>
            和
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline mx-1 transition-colors">
              隐私政策
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
