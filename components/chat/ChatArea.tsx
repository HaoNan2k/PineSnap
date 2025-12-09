import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import {
  MessageRole,
  getAiReply,
  type Message,
  type Conversation,
} from "./chat";
import { useState } from "react";

interface ChatAreaProps {
  conversation: Conversation | undefined;
  onSendMessage: (message: Message) => void;
}

export const ChatArea = ({ conversation, onSendMessage }: ChatAreaProps) => {
  // 获取当前消息列表，如果没有则为空数组
  const messages = conversation?.messages || [];
  // 是否正在输入
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (content: string) => {
    // 1. 组装用户消息
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: MessageRole.USER,
      content: content,
      timestamp: Date.now(),
    };

    // 2. 向上汇报
    onSendMessage(userMessage);

    // 3. 模拟 AI 回复
    setIsTyping(true);
    try {
      const aiMessage = await getAiReply(content);
      onSendMessage(aiMessage);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 1. 消息列表区域 */}
      <MessageList messages={messages} isTyping={isTyping} />

      {/* 2. 底部输入框区域 */}
      {conversation ? (
        <MessageInput onSend={handleSend} />
      ) : (
        // TODO optimize: 优化空状态的显示
        <div className="p-4 text-center text-gray-500">
          请选择或新建一个对话
        </div>
      )}
    </div>
  );
};
