"use client";

import { ArrowDown } from "lucide-react";

import type { Message } from "@/components/chat/types";
import { AssistantTypingIndicator } from "@/components/chat/components/assistant-typing-indicator";
import { Response } from "@/components/chat/components/response";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { MessageActions } from "./message-actions";
import { PreviewAttachment, type Attachment } from "./preview-attachment";
import { ChatPart } from "@/lib/chat/types";

const messageTextClassName = "text-[15px] leading-relaxed";

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";

  // 1. Separate parts
  let textContent = message.content;
  let fileParts: Extract<ChatPart, { type: "file" }>[] = [];

  if (message.parts && message.parts.length > 0) {
    const textParts = message.parts.filter((p) => p.type === "text") as Extract<
      ChatPart,
      { type: "text" }
    >[];
    if (textParts.length > 0) {
      textContent = textParts.map((p) => p.text).join("");
    }
    fileParts = message.parts.filter((p) => p.type === "file") as Extract<
      ChatPart,
      { type: "file" }
    >[];
  }

  // 2. Map to Attachment for PreviewAttachment component
  const attachments: Attachment[] = fileParts.map((p) => ({
    name: p.name,
    mediaType: p.mediaType,
    url: "", // PreviewAttachment will resolve signed URL using ref
    ref: p.ref,
    size: p.size,
  }));

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
                  <PreviewAttachment key={i} attachment={att} />
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

          {/* Attachments for assistant (rare but possible) */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap justify-start gap-2 mt-2">
              {attachments.map((att, i) => (
                <PreviewAttachment key={i} attachment={att} />
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
}: {
  messages: Message[];
  isAssistantTyping: boolean;
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
            <MessageItem key={message.id} message={message} />
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
