"use client";

import { ArrowDown } from "lucide-react";

import type { Message } from "@/components/chat/types";
import { AssistantTypingIndicator } from "@/components/chat/components/assistant-typing-indicator";
import { Response } from "@/components/chat/components/response";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";
import { A2UIRenderer, type A2UIAddToolResult } from "@/components/chat/a2ui/renderer";

const messageTextClassName = "text-[15px] leading-relaxed";

function MessageItem({
  message,
  addToolResult,
}: {
  message: Message;
  addToolResult?: (payload: A2UIAddToolResult) => void;
}) {
  const isUser = message.role === "user";

  // 1. Separate parts
  let textContent = message.content;
  const attachments = message.attachments ?? [];

  // Prefer structured text parts if present.
  if (message.parts && message.parts.length > 0) {
    const textParts = message.parts.filter((p) => p.type === "text") as Array<
      Extract<(typeof message.parts)[number], { type: "text" }>
    >;
    if (textParts.length > 0) {
      textContent = textParts.map((p) => p.text).join("");
    }
  }

  if (isUser) {
    return (
      <div className="group/message fade-in w-full animate-in duration-200">
        <div className="flex w-full items-start justify-end gap-3">
          <div className="flex max-w-[min(fit-content,80%)] flex-col items-end gap-2">
            
            {/* Text Bubble */}
            {textContent && (
              <div
                className={cn(
                  "w-fit break-words px-5 py-3.5 text-right text-white shadow-sm rounded-3xl",
                  messageTextClassName,
                  "bg-gray-900" // v0-like black bubble
                )}
              >
                <div className="whitespace-pre-wrap">{textContent}</div>
              </div>
            )}

            {/* Attachments - Rendered separately below bubble */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2">
                {attachments.map((att, i) => (
                  <PreviewAttachment
                    key={`${att.ref ?? "no-ref"}-${att.url ?? "no-url"}-${i}`}
                    attachment={{
                      name: att.name,
                      mediaType: att.mediaType,
                      url: att.url ?? "",
                      ref: att.ref ?? "",
                      size: att.size,
                    }}
                  />
                ))}
              </div>
            )}

            <div className="mt-1 flex justify-end opacity-0 transition-opacity group-hover/message:opacity-100">
              <MessageActions message={message} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group/message fade-in w-full animate-in duration-200">
      <div className="flex w-full items-start justify-start gap-3">
        <div className="flex w-full flex-col gap-2">
          <div
            className={cn("bg-transparent px-0 py-0 text-left", messageTextClassName)}
          >
            <Response>{textContent}</Response>
          </div>

          {/* A2UI Renderer */}
          <A2UIRenderer parts={message.uiParts} addToolResult={addToolResult} />

          {/* Attachments for assistant (rare but possible) */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap justify-start gap-2 mt-2">
              {attachments.map((att, i) => (
                <PreviewAttachment
                  key={`${att.ref ?? "no-ref"}-${att.url ?? "no-url"}-${i}`}
                  attachment={{
                    name: att.name,
                    mediaType: att.mediaType,
                    url: att.url ?? "",
                    ref: att.ref ?? "",
                    size: att.size,
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-1 flex justify-start opacity-0 transition-opacity group-hover/message:opacity-100">
            <MessageActions message={message} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const MessageList = ({
  messages,
  isAssistantTyping,
  addToolResult,
}: {
  messages: Message[];
  isAssistantTyping: boolean;
  addToolResult?: (payload: A2UIAddToolResult) => void;
}) => {
  const { containerRef, endRef, isAtBottom, scrollToBottom } =
    useScrollToBottom();

  return (
    <div className="relative flex-1">
      <div
        className="absolute inset-0 touch-pan-y overflow-y-auto"
        ref={containerRef}
      >
        <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-8 px-4 py-8 md:px-6">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              addToolResult={addToolResult}
            />
          ))}

          {isAssistantTyping &&
          messages[messages.length - 1]?.role !== "assistant" ? (
            <div className="group/message fade-in w-full animate-in duration-200">
              <div className="flex w-full items-start justify-start gap-3">
                <div className="flex w-full flex-col">
                  <AssistantTypingIndicator />
                </div>
              </div>
            </div>
          ) : null}

          <div className="min-h-[24px] min-w-[24px] shrink-0" ref={endRef} />
        </div>
      </div>

      <button
        aria-label="Scroll to bottom"
        className={cn(
          "-translate-x-1/2 absolute bottom-4 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-all hover:bg-muted",
          isAtBottom
            ? "pointer-events-none scale-0 opacity-0"
            : "pointer-events-auto scale-100 opacity-100"
        )}
        onClick={() => scrollToBottom("smooth")}
        type="button"
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
};
