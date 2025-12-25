"use client"

import { ArrowDown } from "lucide-react"

import type { Message } from "@/components/chat/types"
import { AssistantTypingIndicator } from "@/components/chat/components/assistant-typing-indicator"
import { Response } from "@/components/chat/components/response"
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom"
import { cn } from "@/lib/utils"
import { MessageActions } from "./message-actions"

const messageTextClassName = "text-sm leading-relaxed"

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user"

  if (isUser) {
    return (
      <div className="group/message fade-in w-full animate-in duration-200">
        <div className="flex w-full items-start justify-start gap-3">
          <div className="flex max-w-[min(fit-content,80%)] flex-col">
            <div
              className={cn(
                "w-fit break-words rounded-2xl px-3 py-2 text-right text-white",
                messageTextClassName
              )}
              style={{ backgroundColor: "#006cff" }}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>

            <div className="mt-1 flex justify-start opacity-0 transition-opacity group-hover/message:opacity-100">
              <MessageActions message={message} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group/message fade-in w-full animate-in duration-200">
      <div className="flex w-full items-start justify-start gap-3">
        <div className="flex w-full flex-col">
          <div className={cn("bg-transparent px-0 py-0 text-left", messageTextClassName)}>
            <Response>{message.content}</Response>
          </div>

          <div className="mt-1 flex justify-start opacity-0 transition-opacity group-hover/message:opacity-100">
            <MessageActions message={message} />
          </div>
        </div>
      </div>
    </div>
  )
}

export const MessageList = ({
  messages,
  isAssistantTyping,
}: {
  messages: Message[]
  isAssistantTyping: boolean
}) => {
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom()

  return (
    <div className="relative flex-1">
      <div
        className="absolute inset-0 touch-pan-y overflow-y-auto"
        ref={containerRef}
      >
        <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
          {messages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}

          {isAssistantTyping && messages[messages.length - 1]?.role !== "assistant" ? (
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
  )
}
