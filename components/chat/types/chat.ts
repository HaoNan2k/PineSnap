export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  role: string;
  content: MessageContent;
  createdAt: Date;
}

type MessageContent = string;
