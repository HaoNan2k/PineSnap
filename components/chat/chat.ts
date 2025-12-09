export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent;
  timestamp: number;
}

export enum MessageRole {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

type MessageContent = string;

// 生成一些模拟数据来测试滚动
export const getAiReply = async (
  userMessageContent: string
): Promise<Message> => {
  // 延迟1秒
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const id = crypto.randomUUID();
  const role = MessageRole.ASSISTANT;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessageContent }),
  });

  const data = await res.json();
  const content = data.reply;

  return {
    id,
    role,
    content,
    timestamp: Date.now(),
  };
};
