import { ChatPart } from "@/lib/chat/types";

export interface MessageAttachment {
  name: string;
  mediaType: string;
  /**
   * Optional: short-lived signed URL (fast path for initial render).
   * If missing/expired, the UI should refresh using `ref`.
   */
  url?: string;
  /**
   * Stable storage reference key: users/<userId>/...
   * Used to mint a new signed URL when needed.
   */
  ref?: string;
  size?: number;
}

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
  attachments?: MessageAttachment[];
  createdAt: Date;
}
