"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimationPhase =
  | "idle"          // 初始：空密码框
  | "typing"        // 自动输入密码
  | "clicking"      // 点击登录按钮
  | "error"         // 密码错误
  | "waitClick"     // 等待用户点击忘记密码（dim + highlight）
  | "reset";        // 重置密码界面

interface LoginMockupProps {
  animated?: boolean;
  onResetShown?: () => void;
}

const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

export function LoginMockup({ animated = false, onResetShown }: LoginMockupProps) {
  const [phase, setPhase] = useState<AnimationPhase>(animated ? "idle" : "waitClick");
  const [typedChars, setTypedChars] = useState(0);
  const password = "mypassword";

  useEffect(() => {
    if (!animated) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase("typing"), 800));

    for (let i = 1; i <= password.length; i++) {
      timers.push(setTimeout(() => setTypedChars(i), 800 + i * 100));
    }

    const afterType = 800 + password.length * 100 + 400;
    timers.push(setTimeout(() => setPhase("clicking"), afterType));
    timers.push(setTimeout(() => setPhase("error"), afterType + 600));
    timers.push(setTimeout(() => setPhase("waitClick"), afterType + 1600));

    return () => timers.forEach(clearTimeout);
  }, [animated]);

  const handleForgotClick = useCallback(() => {
    if (phase === "waitClick") {
      setPhase("reset");
      onResetShown?.();
    }
  }, [phase, onResetShown]);

  const showDots = phase !== "idle";
  const dotCount = phase === "typing" ? typedChars : password.length;
  const isDimmed = phase === "waitClick";

  return (
    <div className="rounded-xl border border-border-light bg-surface p-6 max-w-xs mx-auto shadow-sm relative">
      <AnimatePresence mode="wait">
        {phase !== "reset" ? (
          <motion.div
            key="login"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Form fields — dim when waiting for click */}
            <motion.div
              animate={{ opacity: isDimmed ? 0.35 : 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
            >
              <p className="text-sm font-semibold text-text-main mb-4">登录</p>

              {/* Email field */}
              <div className="mb-3">
                <p className="text-[11px] text-text-faint mb-1 font-medium">邮箱</p>
                <div className="h-10 rounded-lg border border-border bg-cream-warm px-3 flex items-center">
                  <span className="text-sm text-text-secondary">you@example.com</span>
                </div>
              </div>

              {/* Password field */}
              <div className="mb-4">
                <p className="text-[11px] text-text-faint mb-1 font-medium">密码</p>
                <div className={cn(
                  "h-10 rounded-lg border px-3 flex items-center transition-colors duration-200",
                  phase === "error" || phase === "waitClick"
                    ? "border-error/50 bg-error/5"
                    : "border-border bg-cream-warm"
                )}>
                  {showDots ? (
                    <span className="text-sm text-forest tracking-widest">
                      {"●".repeat(dotCount)}
                      {phase === "typing" && (
                        <span className="inline-block w-[2px] h-4 bg-forest ml-0.5 animate-pulse" />
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-text-faint">输入密码</span>
                  )}
                </div>
                <AnimatePresence>
                  {(phase === "error" || phase === "waitClick") && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-error mt-1.5"
                    >
                      密码错误，请重试
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Login button */}
              <div className={cn(
                "h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                phase === "clicking"
                  ? "bg-forest/30 scale-[0.97]"
                  : "bg-forest/20"
              )}>
                <span className="text-sm font-medium text-forest">登录</span>
              </div>
            </motion.div>

            {/* "忘记密码？" — stays bright, everything else dims */}
            <AnimatePresence>
              {phase === "waitClick" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
                  className="mt-4 text-center"
                >
                  <button
                    onClick={handleForgotClick}
                    className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-forest font-medium cursor-pointer transition-colors hover:bg-forest/5"
                  >
                    {/* Subtle glow behind text */}
                    <span className="absolute inset-0 rounded-lg bg-forest/5 animate-[pulse_2s_ease-in-out_infinite]" />
                    <span className="relative">忘记密码？</span>
                    {/* Pulsing dot */}
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full rounded-full bg-forest/30 animate-ping" />
                      <span className="relative inline-flex size-2 rounded-full bg-forest" />
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ── Reset password form (realistic) ──────────── */
          <motion.div
            key="reset"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
          >
            <p className="text-sm font-semibold text-text-main mb-4">重置密码</p>

            {/* New password field */}
            <div className="mb-3">
              <p className="text-[11px] text-text-faint mb-1 font-medium">新密码</p>
              <div className="h-10 rounded-lg border border-border bg-cream-warm px-3 flex items-center">
                <span className="text-sm text-text-faint">输入新密码</span>
              </div>
            </div>

            {/* Confirm password field */}
            <div className="mb-4">
              <p className="text-[11px] text-text-faint mb-1 font-medium">确认密码</p>
              <div className="h-10 rounded-lg border border-border bg-cream-warm px-3 flex items-center">
                <span className="text-sm text-text-faint">再次输入新密码</span>
              </div>
            </div>

            {/* Save button */}
            <div className="h-10 rounded-lg bg-forest/20 flex items-center justify-center">
              <span className="text-sm font-medium text-forest">保存新密码</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
