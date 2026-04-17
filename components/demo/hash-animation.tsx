"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const EXAMPLES = [
  { input: "hello123", hash: "f6c08cdd85fb084e" },
  { input: "Hello123", hash: "a15bf86e3cd87e9c" },
];

export function HashAnimation() {
  const [showFirst, setShowFirst] = useState(false);
  const [showSecond, setShowSecond] = useState(false);

  function handleTrigger() {
    if (!showFirst) {
      setShowFirst(true);
    } else if (!showSecond) {
      setShowSecond(true);
    }
  }

  return (
    <div className="space-y-5">
      {/* First example */}
      <HashRow
        example={EXAMPLES[0]}
        showHash={showFirst}
      />

      {/* Second example - shows below the first for comparison */}
      {showSecond && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
        >
          <HashRow
            example={EXAMPLES[1]}
            showHash
            highlight
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-forest font-medium mt-3"
          >
            只改了一个字母（h → H），哈希值完全不同。
          </motion.p>
        </motion.div>
      )}

      {/* Action button */}
      {!(showFirst && showSecond) && (
        <button
          onClick={handleTrigger}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            "border border-forest/30 text-forest hover:bg-forest/5"
          )}
        >
          {!showFirst ? "运行哈希函数" : "改一个字母试试"}
        </button>
      )}
    </div>
  );
}

function HashRow({
  example,
  showHash,
  highlight,
}: {
  example: { input: string; hash: string };
  showHash: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Password input */}
      <div className={cn(
        "rounded-xl border bg-surface px-5 py-4 min-w-[160px]",
        highlight ? "border-forest/30" : "border-border-light"
      )}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-faint mb-1">
          密码
        </p>
        <p className="font-[family-name:var(--font-display)] text-xl text-text-main">
          {highlight ? (
            <>
              <span className="text-forest">H</span>
              {example.input.slice(1)}
            </>
          ) : (
            example.input
          )}
        </p>
      </div>

      {/* Arrow + label */}
      <div className="flex flex-col items-center gap-1">
        <ArrowRight className="size-5 text-forest-muted" />
        <span className="text-[11px] text-forest-muted font-medium">哈希函数</span>
      </div>

      {/* Hash output */}
      <div
        className={cn(
          "rounded-xl border px-5 py-4 min-w-[200px] transition-all duration-300",
          showHash
            ? "border-forest/30 bg-cream-warm"
            : "border-border-light bg-surface"
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-faint mb-1">
          哈希值
        </p>
        {showHash ? (
          <motion.p
            className="font-mono text-base text-forest-muted tracking-tight"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.03 } },
            }}
          >
            {example.hash.split("").map((char, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {char}
              </motion.span>
            ))}
          </motion.p>
        ) : (
          <p className="font-mono text-base text-border tracking-tight">
            ????????????????
          </p>
        )}
      </div>
    </div>
  );
}
