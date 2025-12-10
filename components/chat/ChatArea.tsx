import { useChat } from "@ai-sdk/react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { MessageRole, type Message, type Conversation } from "./chat";

interface ChatAreaProps {
  conversation: Conversation | undefined;
  onConversationActivity?: (id: string) => void;
}

export const ChatArea = ({
  conversation,
  onConversationActivity,
}: ChatAreaProps) => {
  const { messages: uiMessages, sendMessage } = useChat({
    id: conversation?.id ?? "default",
  });

  const mappedMessages: Message[] = uiMessages
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .map((message) => {
      const text = message.parts
        .map((part) => {
          if (part.type === "text") {
            return part.text;
          }
        })
        .join("\n");

      return {
        id: message.id,
        role:
          message.role === "user" ? MessageRole.USER : MessageRole.ASSISTANT,
        content: text,
        timestamp: 0,
      };
    });

  const handleSend = (content: string) => {
    if (!conversation) return;
    onConversationActivity?.(conversation.id);
    sendMessage({ text: content });
  };

  if (!conversation) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 text-center text-gray-500">
          请选择或新建一个对话
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={mappedMessages} isTyping={false} />
      <MessageInput onSend={handleSend} />
    </div>
  );
};
