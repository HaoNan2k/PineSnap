"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

type Phase =
  | "password"     // 显示密码明文
  | "hashing"      // 密码变成哈希
  | "stored"       // 哈希存入数据库
  | "erased"       // 原始密码消失
  | "reveal";      // 最终揭示

const PASSWORD = "hello123";
const HASH = "f6c08cdd85fb084e";

export function DiscoveryMoment() {
  const [phase, setPhase] = useState<Phase>("password");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("hashing"), 1400));
    timers.push(setTimeout(() => setPhase("stored"), 3000));
    timers.push(setTimeout(() => setPhase("erased"), 4400));
    timers.push(setTimeout(() => setPhase("reveal"), 5600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const phaseIndex = ["password", "hashing", "stored", "erased", "reveal"].indexOf(phase);

  return (
    <div className="space-y-8">
      {/* Title */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-lg text-text-main leading-relaxed text-center"
      >
        你的密码，从注册那一刻起...
      </motion.p>

      {/* Vertical flow animation */}
      <div className="max-w-xs mx-auto space-y-4">

        {/* Row 1: Password */}
        <motion.div
          animate={{
            opacity: phaseIndex >= 3 ? 0.15 : 1,
            scale: phaseIndex >= 3 ? 0.95 : 1,
          }}
          transition={{ duration: 0.5, ease: EASE_OUT_QUART }}
          className="rounded-xl border border-border-light bg-surface p-4 relative overflow-hidden"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint mb-2">
            你输入的密码
          </p>
          <AnimatePresence mode="wait">
            {phaseIndex < 1 ? (
              <motion.p
                key="plain"
                exit={{ opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.5 }}
                className="text-lg font-mono font-medium text-text-main"
              >
                {PASSWORD}
              </motion.p>
            ) : (
              <motion.p
                key="dots"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-lg text-forest tracking-widest"
              >
                ●●●●●●●●
              </motion.p>
            )}
          </AnimatePresence>

          {/* Strike-through line when erased */}
          {phaseIndex >= 3 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
              className="absolute left-4 right-4 top-1/2 h-[2px] bg-error/40 origin-left"
            />
          )}
        </motion.div>

        {/* Arrow down */}
        <motion.div
          animate={{ opacity: phaseIndex >= 1 ? 1 : 0.2 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          <motion.span
            animate={{ y: phaseIndex >= 1 && phaseIndex < 3 ? [0, 3, 0] : 0 }}
            transition={{ repeat: phaseIndex >= 1 && phaseIndex < 3 ? Infinity : 0, duration: 0.8 }}
            className="text-forest-muted text-xl"
          >
            ↓
          </motion.span>
          <span className="text-[10px] text-forest-muted font-medium">哈希函数（不可逆）</span>
        </motion.div>

        {/* Row 2: Hash value */}
        <motion.div
          animate={{
            opacity: phaseIndex >= 1 ? 1 : 0.3,
          }}
          transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
          className="rounded-xl border border-border-light bg-cream-warm p-4"
          style={{
            borderColor: phaseIndex >= 2 ? "var(--forest)" : undefined,
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint mb-2">
            服务器存储的哈希值
          </p>
          {phaseIndex >= 1 ? (
            <motion.p
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.025 } },
              }}
              className="font-mono text-base text-forest-muted break-all"
            >
              {HASH.split("").map((char, i) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 6 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.p>
          ) : (
            <p className="font-mono text-base text-border">????????????????</p>
          )}
        </motion.div>

        {/* Arrow down to database */}
        <motion.div
          animate={{ opacity: phaseIndex >= 2 ? 1 : 0.2 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          <motion.span
            animate={{ y: phaseIndex >= 2 && phaseIndex < 4 ? [0, 3, 0] : 0 }}
            transition={{ repeat: phaseIndex >= 2 && phaseIndex < 4 ? Infinity : 0, duration: 0.8 }}
            className="text-forest-muted text-xl"
          >
            ↓
          </motion.span>
          <span className="text-[10px] text-forest-muted font-medium">安全存储</span>
        </motion.div>

        {/* Row 3: Database confirmation */}
        <motion.div
          animate={{
            opacity: phaseIndex >= 2 ? 1 : 0.3,
            scale: phaseIndex >= 2 ? 1 : 0.95,
          }}
          transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
          className="rounded-xl border border-border-light bg-surface p-4 text-center"
        >
          {phaseIndex >= 2 ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
              className="flex items-center justify-center gap-2"
            >
              <span className="size-6 rounded-full bg-success flex items-center justify-center">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                  className="text-white text-xs"
                >
                  ✓
                </motion.span>
              </span>
              <span className="text-sm text-success font-medium">哈希值已安全存储</span>
            </motion.div>
          ) : (
            <span className="text-sm text-text-faint">等待存储...</span>
          )}
        </motion.div>

        {/* Password erased note */}
        <AnimatePresence>
          {phaseIndex >= 3 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
              className="text-center text-sm text-text-secondary"
            >
              原始密码？<span className="line-through text-text-faint mx-1">{PASSWORD}</span>
              <span className="text-forest font-medium">已不存在</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Final reveal */}
      <AnimatePresence>
        {phase === "reveal" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT_QUART }}
            className="space-y-6"
          >
            <p className="text-base text-text-secondary text-center leading-relaxed">
              服务器不知道。工程师不知道。客服不知道。
              <br />
              <strong className="text-text-main">只有你知道。</strong>
            </p>

            {/* Amber discovery tag */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex justify-center"
            >
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold bg-acorn/10 text-acorn border border-acorn/20">
                已理解：密码哈希
              </span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-sm text-text-faint text-center"
            >
              下次重置密码的时候，你会知道为什么了。
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
