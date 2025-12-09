// 负责渲染消息列表的组件
import { useEffect, useRef } from "react";
import type { Message } from "./chat";
import { MessageRole } from "./chat";
import { User, Bot } from "lucide-react";

export const MessageList = ({
  messages,
  isTyping,
}: {
  messages: Message[];
  isTyping: boolean;
}) => {
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {messages.map((message) => (
          <div key={message.id}>{renderMessageContent(message, isTyping)}</div>
        ))}

        {isTyping && (
          <div className="flex gap-4 group">
            {/* AI 头像 */}
            <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 bg-teal-600">
              <Bot size={18} className="text-white" />
            </div>

            {/* 思考中动画 */}
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-sm text-gray-900">SocraticU</p>
              <div className="text-gray-500 text-sm animate-pulse">
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>
    </div>
  );
};

const renderMessageContent = (message: Message) => {
  const isUser = message.role === MessageRole.USER;

  return (
    <div className="flex gap-4 group">
      {/* 头像区域 */}
      <div
        className={`
        w-8 h-8 rounded-sm flex items-center justify-center shrink-0
        ${isUser ? "bg-gray-200" : "bg-teal-600"}
      `}
      >
        {isUser ? (
          <User size={18} className="text-gray-600" />
        ) : (
          <Bot size={18} className="text-white" />
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 space-y-1 overflow-hidden">
        {/* 发送者名字 */}
        <p className="font-semibold text-sm text-gray-900">
          {isUser ? "You" : "SocraticU"}
        </p>

        {/* 消息正文 */}
        <div className="text-gray-800 leading-relaxed text-base break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
};
