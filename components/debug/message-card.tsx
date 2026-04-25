"use client";

import { Copyable } from "./copyable";
import { JsonBlock } from "./json-block";
import { formatAbsTime, formatDelta } from "@/lib/debug/utils";
import { cn } from "@/lib/utils";

export type DebugMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "tool" | "system";
  parts: unknown;
  createdAt: string;
  clientMessageId: string | null;
  anchoredCanvasMessageId: string | null;
  deletedAt: string | null;
};

const roleColor: Record<DebugMessage["role"], string> = {
  user: "bg-blue-100 text-blue-800 border-blue-200",
  assistant: "bg-emerald-100 text-emerald-800 border-emerald-200",
  tool: "bg-amber-100 text-amber-800 border-amber-200",
  system: "bg-gray-200 text-gray-800 border-gray-300",
};

export function MessageCard({
  message,
  conversationKind,
  prevCreatedAt,
}: {
  message: DebugMessage;
  conversationKind: "canvas" | "chat";
  prevCreatedAt?: string;
}) {
  const isDeleted = !!message.deletedAt;
  const deltaMs = prevCreatedAt
    ? new Date(message.createdAt).getTime() -
      new Date(prevCreatedAt).getTime()
    : null;

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "border border-gray-200 dark:border-gray-800 rounded bg-white dark:bg-gray-900 p-2 text-[12px] font-mono shadow-sm",
        isDeleted && "opacity-40 line-through"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span
          className={cn(
            "px-1.5 py-0.5 rounded border text-[10px] uppercase font-semibold",
            roleColor[message.role]
          )}
        >
          {message.role}
        </span>
        <span className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-700 text-[10px] uppercase">
          {conversationKind}
        </span>
        <Copyable value={message.id} />
        <span className="text-gray-500 text-[11px]">
          {formatAbsTime(message.createdAt)}
        </span>
        {deltaMs !== null && (
          <span className="text-gray-400 text-[11px]">
            Δ {formatDelta(deltaMs)}
          </span>
        )}
        <button
          type="button"
          disabled
          title="Trace 链接将在 Phase 1 接入观测平台后启用"
          className="ml-auto text-[11px] text-gray-400 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded cursor-not-allowed"
        >
          Trace ↗
        </button>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-3 flex-wrap mb-2 text-[11px] text-gray-500">
        {message.clientMessageId && (
          <span className="flex items-center gap-1">
            <span className="text-gray-400">cmid:</span>
            <Copyable value={message.clientMessageId} />
          </span>
        )}
        {message.anchoredCanvasMessageId && (
          <span className="flex items-center gap-1">
            <span className="text-gray-400">anchor:</span>
            <Copyable value={message.anchoredCanvasMessageId} />
          </span>
        )}
        {message.deletedAt && (
          <span className="text-red-600">
            deleted: {formatAbsTime(message.deletedAt)}
          </span>
        )}
      </div>

      {/* Body — raw parts */}
      <JsonBlock value={message.parts} collapseLevel={1} />
    </div>
  );
}
