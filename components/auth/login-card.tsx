"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { OTPInput, SlotProps } from "input-otp";
import { cn } from "@/lib/utils";
import Image from "next/image";

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

  // 倒计时逻辑
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onSendOtp = async () => {
    setStatus("loading");
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
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
    setCountdown(60); // 60秒倒计时
    toast.success("验证码已发送");
  };

  const onVerifyOtp = async (token: string) => {
    setStatus("loading");
    setErrorMessage(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      setOtp(""); // 清空以便重试
      return;
    }

    toast.success("登录成功");
    
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.push("/chat");
    }
    
    router.refresh();
  };

  const handleBack = () => {
    setStep("email");
    setOtp("");
    setErrorMessage(null);
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && email.trim()) {
      e.preventDefault();
      onSendOtp();
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      {/* 移动端 Logo (仅在 lg 以下显示) */}
      <div className="lg:hidden flex items-center gap-2 mb-8 justify-center opacity-90">
        <div className="relative h-8 w-8">
          <Image 
            src="/brand-icon.svg" 
            alt="PineSnap Logo" 
            fill
            className="object-contain"
          />
        </div>
        <span className="font-serif text-xl font-medium text-foreground tracking-tight">PineSnap</span>
      </div>

      {step === "email" ? (
        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-left space-y-1">
            <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">欢迎回来</h1>
            {/* 移除副标题 */}
          </div>

          <div className="space-y-6">
            <div className="group relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input
                className="w-full h-14 rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-lg shadow-sm placeholder:text-muted-foreground/40 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleEmailKeyDown}
                autoComplete="email"
                inputMode="email"
                autoFocus
              />
            </div>

            {status === "error" && (
              <div className="text-sm text-destructive text-center font-medium bg-destructive/5 py-3 rounded-xl">
                {errorMessage}
              </div>
            )}

            <button
              className="w-full h-14 rounded-xl bg-primary text-white text-lg font-medium shadow-sm hover:bg-primary/90 hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
              onClick={onSendOtp}
              disabled={status === "loading" || !email.trim()}
            >
              {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
              继续
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 relative pt-2">
           {/* 返回按钮 */}
          <button
            onClick={handleBack}
            className="absolute -top-12 -left-2 p-2 text-muted-foreground/40 hover:text-foreground transition-colors rounded-full hover:bg-black/5"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="text-left space-y-2">
            <h1 className="text-2xl font-serif font-medium tracking-tight text-foreground">查收验证码</h1>
            <p className="text-base text-muted-foreground">
              已发送至 <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <div className="flex flex-col items-center space-y-8">
            <div className="relative w-full flex justify-center">
              <OTPInput
                maxLength={6}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (val.length === 6) {
                    onVerifyOtp(val);
                  }
                }}
                containerClassName="group flex items-center gap-3 has-[:disabled]:opacity-30"
                render={({ slots }) => (
                  <>
                    <div className="flex gap-2 sm:gap-3">
                      {slots.slice(0, 6).map((slot, idx) => (
                        <Slot key={idx} {...slot} />
                      ))}
                    </div>
                  </>
                )}
              />
              
              {status === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl z-10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              )}
            </div>

            {status === "error" && (
              <div className="text-sm text-destructive font-medium animate-shake bg-destructive/5 px-4 py-2 rounded-lg">
                {errorMessage || "验证失败，请重试"}
              </div>
            )}

            <div className="text-center w-full">
              <button
                onClick={() => {
                  if (countdown === 0) {
                    onSendOtp();
                  }
                }}
                disabled={countdown > 0 || status === "loading"}
                className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-muted-foreground"
              >
                {countdown > 0 ? (
                  <span>重新发送 ({countdown}s)</span>
                ) : (
                  <span className="underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-primary">
                    没有收到？重新发送
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 独立的 OTP Slot 组件 - 调整尺寸以匹配 h-14 输入框风格
function Slot(props: SlotProps) {
  return (
    <div
      className={cn(
        "relative w-12 h-16 text-2xl font-medium flex items-center justify-center",
        "transition-all duration-200",
        "border border-gray-200 bg-white rounded-xl shadow-sm", // 加大圆角
        "text-foreground",
        props.isActive && "border-primary ring-4 ring-primary/10 z-10 scale-105", 
        props.hasError && "border-destructive ring-destructive/20 text-destructive"
      )}
    >
      {props.char !== null && <div>{props.char}</div>}
      {props.hasFakeCaret && (
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
          <div className="w-[2px] h-8 bg-primary animate-caret-blink" />
        </div>
      )}
    </div>
  );
}
