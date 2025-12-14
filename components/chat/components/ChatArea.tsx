"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { z } from "zod";
import { MessageList } from "@/components/chat/components/MessageList";
import { MessageInput } from "@/components/chat/components/MessageInput";
import { isChatBusy } from "@/components/chat/types";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Code,
  FileText,
  Lightbulb,
  MoreHorizontal,
} from "lucide-react";
import { ChatPart } from "@/lib/chat/types";

interface ChatAreaProps {
  id: string;
  initialMessages: UIMessage[];
  title?: string;
}

const suggestions = [
  { icon: Code, text: "帮我写一段 React 代码", color: "text-gray-600" },
  { icon: FileText, text: "总结这篇文章的要点", color: "text-gray-600" },
  { icon: Lightbulb, text: "给我一些创业点子", color: "text-gray-600" },
  { icon: Sparkles, text: "帮我优化这段文案", color: "text-gray-600" },
];

function hasContent(m: unknown): m is { content: string } {
  return typeof m === 'object' && m !== null && 'content' in m && typeof (m as { content: unknown }).content === 'string';
}

function hasCreatedAt(m: unknown): m is { createdAt: Date | number | string } {
    return typeof m === 'object' && m !== null && 'createdAt' in m;
}

export const ChatArea = ({
  id,
  initialMessages,
  title = "New Chat",
}: ChatAreaProps) => {

  const {
    messages,
    sendMessage,
    status,
  } = useChat({
    id: id,
    messages: initialMessages, 
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: currentMessages, messageId }) => {
        const last = currentMessages[currentMessages.length - 1];
        let text = "";
        if (last.parts && last.parts.length > 0) {
             text = last.parts
            .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
            .map((p) => p.text)
            .join("\n");
        } else if (hasContent(last)) {
            text = last.content;
        }

        const input: ChatPart[] = [{ type: "text", text }];

        return {
          body: {
            conversationId: id,
            clientMessageId: messageId ?? crypto.randomUUID(),
            input,
          },
        };
      },
    }),
    dataPartSchemas: {
      conversation_id: z.object({ id: z.string() }),
    },
    onFinish: () => {
       window.history.replaceState({}, "", `/chat/c/${id}`);
    }
  });

  const mappedMessages = messages.map((m) => {
      let content = "";
      if (m.parts && m.parts.length > 0) {
          content = m.parts
            .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
            .map(p => p.text)
            .join("\n");
      } else if (hasContent(m)) {
          content = m.content;
      }

      let createdAt = new Date();
      if (hasCreatedAt(m)) {
          createdAt = m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
      }

      return {
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: content,
          createdAt: createdAt,
      };
  });

  const handleSend = async (content: string) => {
    if (isChatBusy(status)) return;
    
    // Construct a UIMessage-like object to send
    // We only provide parts as that's what we want to rely on
    const userMessage = {
        role: 'user',
        parts: [{ type: 'text', text: content }],
    };

    // sendMessage in AI SDK expects an object with { text: string } or CreateMessage/UIMessage.
    // Passing a string directly causes TypeError because SDK uses "text" in message check.
    sendMessage({ text: content });
  };

  const isAssistantTyping = isChatBusy(status);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">
            {title}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        >
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </header>

      {/* Messages Area */}
      {mappedMessages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center overflow-y-auto px-4 md:px-6 py-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            你好，有什么可以帮你？
          </h1>
          <p className="text-gray-500 mb-8 max-w-md">
            我是你的 AI 助手，可以帮你回答问题、撰写文案、编写代码等。
          </p>

          {/* Suggestion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSend(suggestion.text)}
                className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <suggestion.icon className={`w-5 h-5 ${suggestion.color}`} />
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  {suggestion.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <MessageList
          messages={mappedMessages}
          isAssistantTyping={isAssistantTyping}
        />
      )}

      {/* Input Area */}
      <MessageInput onSend={handleSend} disabled={isAssistantTyping} />
    </div>
  );
};
