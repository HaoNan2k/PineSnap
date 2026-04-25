"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, MessageCircle, X } from "lucide-react";
import { DiscussionMessageList } from "./discussion-message-list";
import { DiscussionComposer } from "./discussion-composer";
import { useDiscussionChat } from "./use-discussion-chat";

interface DiscussionSidebarProps {
  learningId: string;
  /**
   * The latest canvas assistant message id. The user's discussion submit
   * uses this as anchor (not the displayed step) — see Light Anchor.
   * May be null while canvas is empty (before first assistant message).
   */
  latestCanvasMessageId: string | null;
  /**
   * Map from anchor message id -> 1-based step number, for rendering
   * "在 step N 时问的" disclosure tags on user messages.
   */
  anchorStepMap: Map<string, number>;
}

const COLLAPSED_WIDTH_PX = 32;
const EXPANDED_WIDTH_PX = 360;

/**
 * Right-side collapsible discussion sidebar.
 *
 * Default state: collapsed strip (~32px) with a "?" icon. User clicks
 * to expand or presses Cmd+/ (Ctrl+/ on Win/Linux). Expanded state
 * is ~360px wide and contains: header / message list / composer.
 *
 * Sidebar does NOT track canvas current step (Light Anchor decision).
 * The discussion timeline is the same regardless of which canvas step
 * the user is viewing. anchor on each user message is purely metadata
 * for the disclosure tag.
 */
export function DiscussionSidebar({
  learningId,
  latestCanvasMessageId,
  anchorStepMap,
}: DiscussionSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [composerValue, setComposerValue] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isStreaming, sendDiscussion } = useDiscussionChat({
    learningId,
    instanceId: `discussion:${learningId}`,
  });

  const focusComposer = () => {
    requestAnimationFrame(() => composerRef.current?.focus());
  };

  const expand = () => {
    setIsOpen(true);
    focusComposer();
  };

  // Cmd+/ (mac) or Ctrl+/ (win/linux) toggles sidebar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (next) focusComposer();
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async () => {
    const text = composerValue.trim();
    if (!text) return;
    if (!latestCanvasMessageId) {
      // Cannot anchor without a canvas step; no-op silently. The composer
      // could be disabled when canvas has no assistant messages but for
      // resilience we double-check here.
      return;
    }
    setComposerValue("");
    try {
      await sendDiscussion(text, latestCanvasMessageId);
    } catch {
      // Restore the input on failure so the user can retry.
      setComposerValue(text);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={expand}
        aria-label="展开 AI 助教（Cmd+/）"
        className={cn(
          "shrink-0 h-full flex items-start justify-center pt-4",
          "border-l border-border-light bg-surface",
          "hover:bg-cream-warm transition-colors"
        )}
        style={{ width: COLLAPSED_WIDTH_PX }}
      >
        <MessageCircle className="size-4 text-forest-muted" />
      </button>
    );
  }

  return (
    <aside
      className={cn(
        "shrink-0 h-full flex flex-col",
        "border-l border-border-light bg-surface"
      )}
      style={{ width: EXPANDED_WIDTH_PX }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light shrink-0">
        <span className="text-sm font-semibold text-text-main">AI 助教</span>
        <button
          onClick={() => setIsOpen(false)}
          aria-label="收起（Cmd+/）"
          className="size-8 rounded-lg flex items-center justify-center hover:bg-forest/5 text-text-secondary hover:text-text-main transition-colors"
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">
            <X />
          </span>
        </button>
      </div>

      <DiscussionMessageList
        messages={messages}
        anchorStepMap={anchorStepMap}
        isStreaming={isStreaming}
      />

      <DiscussionComposer
        ref={composerRef}
        value={composerValue}
        onChange={setComposerValue}
        onSubmit={handleSubmit}
        disabled={isStreaming || latestCanvasMessageId === null}
        placeholder={
          latestCanvasMessageId === null
            ? "等学习开始后再提问..."
            : "问点什么..."
        }
      />
    </aside>
  );
}
