"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

export function LoginCard({
  supabaseUrl,
  supabaseAnonKey,
  redirectTo,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectTo?: string;
}) {
  const supabase = useMemo(
    () => createBrowserClient(supabaseUrl, supabaseAnonKey),
    [supabaseUrl, supabaseAnonKey]
  );
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSendOtp = async () => {
    setStatus("loading");
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 不传递 emailRedirectTo，Supabase 将发送纯数字 OTP
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("idle");
    setStep("verify");
    toast.success("验证码已发送，请检查邮箱");
  };

  const onVerifyOtp = async () => {
    setStatus("loading");
    setErrorMessage(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    toast.success("登录成功");
    
    // 登录成功后跳转
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.push("/chat");
    }
    
    // 刷新页面以确保 Auth Context 更新（虽然 onAuthStateChange 会处理，但路由跳转更稳）
    router.refresh();
  };

  const handleBack = () => {
    setStep("email");
    setOtp("");
    setErrorMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="mx-auto w-full max-w-md p-6">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        {step === "email" ? (
          // 步骤 1: 输入邮箱
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">欢迎回来</h1>
              <p className="text-sm text-muted-foreground">
                输入邮箱以接收 6 位登录验证码
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, onSendOtp)}
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                />
              </div>

              {status === "error" && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <button
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                onClick={onSendOtp}
                disabled={status === "loading" || !email.trim()}
              >
                {status === "loading" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                发送验证码
              </button>
            </div>
          </div>
        ) : (
          // 步骤 2: 输入验证码
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <button
                onClick={handleBack}
                className="absolute left-8 top-8 flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回
              </button>
              <h1 className="text-2xl font-semibold tracking-tight">输入验证码</h1>
              <p className="text-sm text-muted-foreground">
                已发送 6 位验证码至 <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-center text-2xl font-semibold tracking-widest ring-offset-background placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                    setOtp(val);
                    if (val.length === 6) {
                      // 自动触发验证（体验更好，但需要小心 status 状态，这里还是让用户点或者回车更稳）
                    }
                  }}
                  onKeyDown={(e) => handleKeyDown(e, onVerifyOtp)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {status === "error" && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  验证失败：{errorMessage}
                </div>
              )}

              <button
                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                onClick={onVerifyOtp}
                disabled={status === "loading" || otp.length !== 6}
              >
                {status === "loading" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "验证登录"
                )}
              </button>

              <div className="text-center">
                <button
                  onClick={onSendOtp}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                  disabled={status === "loading"}
                >
                  没收到？重新发送
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
