export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent;
  createdAt: Date;
}

// 这里可以考虑直接复用 Prisma 的 Enum，但为了保持前端独立性，手动维护一个映射也行。
// 但既然我们用了全栈 Prisma，直接 export enum 其实更方便。
// 暂时保持手动定义，以免引入后端依赖到纯前端组件（虽然 Next.js 是混合的）。
export enum MessageRole {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
  SYSTEM = "SYSTEM",
}

type MessageContent = string;
