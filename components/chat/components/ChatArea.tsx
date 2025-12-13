import { useChat } from "@ai-sdk/react";
import { useEffect, useState, useRef, useMemo } from "react";
import { MessageList } from "@/components/chat/components/MessageList";
import { MessageInput } from "@/components/chat/components/MessageInput";
import {
  MessageRole,
  type Message,
  type Conversation,
} from "@/components/chat/types";
import { ChatStatus, isChatBusy } from "@/components/chat/types";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Code,
  FileText,
  Lightbulb,
  MoreHorizontal,
} from "lucide-react";

interface ChatAreaProps {
  conversation: Conversation | undefined;
  onConversationActivity?: (id: string) => void;
  onStartConversation?: (id: string) => void;
}

const suggestions = [
  { icon: Code, text: "帮我写一段 React 代码", color: "text-gray-600" },
  { icon: FileText, text: "总结这篇文章的要点", color: "text-gray-600" },
  { icon: Lightbulb, text: "给我一些创业点子", color: "text-gray-600" },
  { icon: Sparkles, text: "帮我优化这段文案", color: "text-gray-600" },
];

export const ChatArea = ({
  conversation,
  onConversationActivity,
  onStartConversation,
}: ChatAreaProps) => {
  const [draftId] = useState(() => crypto.randomUUID());
  const chatId = conversation?.id ?? draftId;

  // 1. 准备初始消息，供 useChat 使用
  // useChat 会接管这些消息的状态，后续的 updates 也会在这里面
  const initialMessages = useMemo(() => {
    if (!conversation?.messages) return [];
    return conversation.messages.map((m) => ({
      id: m.id,
      role: m.role === MessageRole.USER ? "user" : "assistant",
      parts: [{ type: "text", text: m.content }],
    }));
  }, [conversation?.messages]); // 只有当 messages 数组引用变化时才重新计算（通常是切会话时）

  const {
    messages: uiMessages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    id: chatId,
    messages: initialMessages as any[], // 类型兼容
  });

  // 当切会话时，强制重置 useChat 的内部消息状态为当前会话的消息
  // 这是为了解决 useChat 在 id 变化时有时不会自动重置 initialMessages 的问题（视版本而定）
  // 或者当 useConversations 拉取到新数据时，更新 UI
  useEffect(() => {
    setMessages(initialMessages as any[]);
  }, [initialMessages, setMessages]);

  const submitLockRef = useRef(false);

  // 2. 将 AI SDK 的 messages 映射回我们 UI 组件需要的 Message 类型
  const mappedMessages: Message[] = uiMessages
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .map((message) => {
      // 处理多模态 parts (text parts)
      let text = "";
      if (message.parts) {
        text = message.parts
          .filter(
            (part: any): part is { type: "text"; text: string } =>
              part.type === "text"
          )
          .map((part: any) => part.text)
          .join("\n");
      }

      return {
        id: message.id,
        role:
          message.role === "user" ? MessageRole.USER : MessageRole.ASSISTANT,
        content: text,
        createdAt: new Date(), // 如果没有时间，默认现在
      };
    });

  const handleSend = (content: string) => {
    if (submitLockRef.current) return;
    if (isChatBusy(status)) return;

    submitLockRef.current = true;
    if (!conversation) {
      onStartConversation?.(chatId);
    }
    onConversationActivity?.(chatId);

    // 使用 sendMessage 发送新消息
    sendMessage(
      {
        parts: [{ type: "text", text: content }],
      },
      {
        body: { conversationId: chatId },
      }
    );
  };

  const isAssistantTyping = isChatBusy(status);

  useEffect(() => {
    if (status === ChatStatus.Ready || status === ChatStatus.Error) {
      submitLockRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    submitLockRef.current = false;
  }, [conversation?.id]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">
            {conversation?.title || "New Chat"}
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
