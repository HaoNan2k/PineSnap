"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ForgotPasswordSimProps {
  clicked: boolean;
  onClick: () => void;
}

export function ForgotPasswordSim({ clicked, onClick }: ForgotPasswordSimProps) {
  return (
    <div className="rounded-xl border border-border-light bg-surface p-6 max-w-sm mx-auto shadow-sm">
      <AnimatePresence mode="wait">
        {!clicked ? (
          <motion.div
            key="before"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <p className="text-sm font-semibold text-text-main">登���</p>
            {/* Email */}
            <div>
              <p className="text-[11px] text-text-faint mb-1 font-medium">邮箱</p>
              <div className="h-10 rounded-lg border border-border bg-cream-warm px-3 flex items-center">
                <span className="text-sm text-text-secondary">you@example.com</span>
              </div>
            </div>
            {/* Password - empty */}
            <div>
              <p className="text-[11px] text-text-faint mb-1 font-medium">密码</p>
              <div className="h-10 rounded-lg border border-border bg-cream-warm px-3 flex items-center">
                <span className="text-sm text-text-faint">忘了...</span>
              </div>
            </div>
            {/* Forgot password link */}
            <button
              onClick={onClick}
              className={cn(
                "text-sm text-forest font-medium hover:underline transition-colors",
                "cursor-pointer"
              )}
            >
              忘记密码？
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="after"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-4"
          >
            <p className="text-sm font-semibold text-text-main">重置密码</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              我们向 you@example.com 发送了一封邮件。
              请点击链接<strong>设置新密码</strong>。
            </p>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-xs text-text-secondary">
                注意：我们不能告诉你旧密码。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {clicked && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-sm text-text-secondary leading-relaxed"
        >
          网站不能告诉你旧密码，<strong className="text-text-main">因为它也不知道</strong>。
          服务器里只有哈��值，而哈希是不可逆的。所以只能让你设一个新的。
        </motion.p>
      )}
    </div>
  );
}
