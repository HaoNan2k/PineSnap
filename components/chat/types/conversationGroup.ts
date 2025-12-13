import type { Conversation } from "@/components/chat/types";

export type ConversationGroupId = "today" | "this_week" | "earlier";

export interface ConversationGroup {
  id: ConversationGroupId;
  label: string;
  items: Conversation[];
}
