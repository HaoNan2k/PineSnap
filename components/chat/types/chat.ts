import { ChatPart } from "@/lib/chat/types";

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
  content: string;
  parts?: ChatPart[];
  createdAt: Date;
}
