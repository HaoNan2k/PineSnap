"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Response } from "@/components/chat/components/response";
import type { UIMessage } from "ai";

interface DiscussionMessageListProps {
  messages: UIMessage[];
  /**
   * Map from a canvas message id (anchor) to its 1-based step number.
   * Used to render the "在 step N 时问的" disclosure tag on user messages.
   * If a message's anchor is missing from this map (dangling anchor —
   * canvas message was soft-deleted), the tag is silently omitted.
   */
  anchorStepMap: Map<string, number>;
  /**
   * Whether a discussion request is currently streaming.
   * Used to render a typing indicator at the tail.
   */
  isStreaming: boolean;
}

function extractText(message: UIMessage): string {
  if (!message.parts) return "";
  return message.parts
    .filter(
      (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
    )
    .map((p) => p.text)
    .join("\n");
}

function extractAnchor(message: UIMessage): string | undefined {
  // Anchor is stored on the DB row, not exposed on UIMessage by AI SDK.
  // We surface it by attaching a custom field via the converter on the
  // server side. Falls back to undefined when not present.
  const m = message as unknown as { anchoredCanvasMessageId?: string };
  return m.anchoredCanvasMessageId;
}

export function DiscussionMessageList({
  messages,
  anchorStepMap,
  isStreaming,
}: DiscussionMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming chunks.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isStreaming]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 text-center">
        <p className="text-sm text-forest-muted">
          有什么问题可以问我。
        </p>
        <p className="text-xs text-forest-muted/70 mt-2">
          AI 助教会读你的学习内容，跨 step 引用没问题。
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg) => {
        const text = extractText(msg);
        if (!text) return null;
        const isUser = msg.role === "user";
        const anchor = isUser ? extractAnchor(msg) : undefined;
        const stepNumber = anchor ? anchorStepMap.get(anchor) : undefined;

        return (
          <div
            key={msg.id}
            className={cn(
              "rounded-xl px-3 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-forest/10 text-text-main ml-6"
                : "bg-cream-warm text-text-main"
            )}
          >
            <Response>{text}</Response>
            {isUser && stepNumber !== undefined && (
              <div className="mt-1.5 text-[10px] uppercase tracking-wider text-forest-muted/70">
                在 step {stepNumber} 时问的
              </div>
            )}
          </div>
        );
      })}
      {isStreaming && (
        <div className="rounded-xl px-3 py-2.5 text-sm bg-cream-warm text-forest-muted italic">
          思考中...
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
