// 负责渲染消息列表的组件
import { useEffect, useRef, useState } from "react";
import type { Message } from "@/components/chat/types";
import { AssistantTypingIndicator } from "@/components/chat/components/AssistantTypingIndicator";
import { MessageRow } from "@/components/chat/components/MessageRow";
import { MarkdownContent } from "@/components/chat/components/MarkdownContent";

export const MessageList = ({
  messages,
  isAssistantTyping,
}: {
  messages: Message[];
  isAssistantTyping: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  useEffect(() => {
    if (!pinnedToBottom) return;
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pinnedToBottom]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 relative"
      onScroll={() => {
        const el = containerRef.current;
        if (!el) return;
        const threshold = 120;
        const atBottom =
          el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
        setPinnedToBottom(atBottom);
      }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <div key={message.id}>
            <MessageRow role={message.role} createdAt={message.createdAt}>
              <MarkdownContent content={message.content} />
            </MessageRow>
          </div>
        ))}

        {isAssistantTyping && messages[messages.length - 1]?.role !== "assistant" ? (
          <MessageRow role="assistant">
            <AssistantTypingIndicator />
          </MessageRow>
        ) : null}

        <div ref={messageEndRef} />
      </div>

      {!pinnedToBottom ? (
        <div className="sticky bottom-4 flex justify-end pointer-events-none">
          <button
            type="button"
            className="pointer-events-auto px-3 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-500 hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            onClick={() => {
              messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            回到底部
          </button>
        </div>
      ) : null}
    </div>
  );
};
