"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface DiscussionComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  /** Placeholder shown when input is empty. */
  placeholder?: string;
}

/**
 * Bottom-anchored composer inside the discussion sidebar.
 *
 * Textarea + send button. Enter submits (Shift+Enter = newline).
 * Respects IME composition (Chinese/Japanese input) via
 * e.nativeEvent.isComposing.
 */
export const DiscussionComposer = forwardRef<
  HTMLTextAreaElement,
  DiscussionComposerProps
>(function DiscussionComposer(
  { value, onChange, onSubmit, disabled, placeholder = "问点什么..." },
  ref
) {
  return (
    <div className="shrink-0 border-t border-border-light px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (!disabled && value.trim()) onSubmit();
            }
          }}
          disabled={disabled}
          rows={1}
          placeholder={placeholder}
          className={cn(
            "flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-main",
            "focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest",
            "disabled:opacity-50 resize-none",
            "max-h-32 overflow-y-auto"
          )}
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className={cn(
            "px-3 py-2 rounded-lg bg-forest text-white text-sm font-medium shrink-0",
            "hover:bg-forest-dark transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          发送
        </button>
      </div>
    </div>
  );
});
