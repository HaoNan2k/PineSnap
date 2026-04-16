"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Response } from "@/components/chat/components/response";
import { A2UIRenderer, type A2UIAddToolResult } from "@/components/chat/a2ui/renderer";
import type { UIMessage } from "ai";
import { getToolInvocationsFromLastStep } from "@/lib/chat/utils";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts: UIMessage["parts"] | undefined;
  hasA2UI: boolean;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: DisplayMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isBusy: boolean;
  addToolResult?: (payload: A2UIAddToolResult) => void;
}

export function ChatDrawer({
  isOpen,
  onClose,
  messages,
  input,
  onInputChange,
  onSend,
  isBusy,
  addToolResult,
}: ChatDrawerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages.length]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[400px] max-w-[85vw] z-50",
          "bg-surface border-l border-border-light shadow-xl",
          "flex flex-col",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light shrink-0">
          <span className="text-sm font-semibold text-text-main">Chat</span>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center hover:bg-forest/5 text-text-secondary hover:text-text-main transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-text-faint text-center py-8">
              还没有消息
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-xl px-3 py-2.5 text-sm",
                msg.role === "assistant"
                  ? "bg-cream-warm text-text-main"
                  : "bg-forest/10 text-text-main ml-6"
              )}
            >
              <Response>{msg.content}</Response>
              {msg.role === "assistant" && msg.hasA2UI && (
                <div className="mt-2">
                  <A2UIRenderer parts={msg.parts} addToolResult={addToolResult} />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border-light px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  if (e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  onSend();
                }
              }}
              disabled={isBusy}
              rows={1}
              placeholder="Ask a question..."
              className={cn(
                "flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-main",
                "focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest",
                "disabled:opacity-50 resize-none"
              )}
            />
            <button
              onClick={onSend}
              disabled={isBusy || !input.trim()}
              className={cn(
                "px-3 py-2 rounded-lg bg-forest text-white text-sm font-medium",
                "hover:bg-forest-dark transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Extract displayable messages from raw UIMessages */
export function toDisplayMessages(
  messages: UIMessage[]
): DisplayMessage[] {
  return messages
    .map((message) => {
      let content = "";
      if (message.parts && message.parts.length > 0) {
        const textParts = message.parts.filter(
          (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
        );
        content = textParts.map((p) => p.text).join("\n");
      } else if (
        typeof message === "object" &&
        message !== null &&
        "content" in message &&
        typeof (message as { content: unknown }).content === "string"
      ) {
        content = (message as { content: string }).content;
      }

      const a2uiInvocations = getToolInvocationsFromLastStep(message.parts);

      return {
        id: message.id,
        role: message.role as "user" | "assistant",
        content,
        parts: message.parts,
        hasA2UI: a2uiInvocations.length > 0,
      };
    })
    .filter((msg) => msg.content.trim().length > 0 || msg.hasA2UI);
}
