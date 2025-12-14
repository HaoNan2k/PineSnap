export type ChatPart = { type: "text"; text: string };

// Internal representation of a message content, agnostic of DB or UI SDK
export interface ChatMessageContent {
  parts: ChatPart[];
}
