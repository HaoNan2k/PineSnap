"use client";

import * as React from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyButton({ text, label = "Copy", className }: CopyButtonProps) {
  const [status, setStatus] = React.useState<
    "idle" | "copied" | "error" | "unavailable"
  >("idle");

  const copy = async () => {
    setStatus("idle");

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setStatus("unavailable");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1200);
    }
  };

  const hint =
    status === "copied"
      ? "Copied"
      : status === "unavailable"
        ? "Clipboard unavailable"
        : status === "error"
          ? "Copy failed"
          : label;

  return (
    <button
      type="button"
      onClick={copy}
      className={
        className ??
        "inline-flex items-center rounded-md border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted"
      }
      aria-label={typeof label === "string" ? label : "Copy"}
      title={hint}
    >
      {hint}
    </button>
  );
}

