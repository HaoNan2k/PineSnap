"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { shortId } from "@/lib/debug/utils";

export function Copyable({
  value,
  display,
  short = true,
  className,
}: {
  value: string;
  display?: string;
  short?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const label = display ?? (short ? shortId(value) : value);

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // ignore
        }
      }}
      title={value}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-1 py-0.5 rounded",
        className
      )}
    >
      <span>{label}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}
