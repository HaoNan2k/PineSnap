import { notFound } from "next/navigation";
import { getConversation } from "@/lib/db/conversation";
import { convertDbToUIMessages } from "@/lib/chat/converter";
import { ChatArea } from "@/components/chat/components/chat-area";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await params;
  
  // TODO: Replace with real user ID from auth
  const userId = "default-user";
  
  const conversation = await getConversation(conversationId, userId);
  
  if (!conversation) {
    notFound();
  }

  const uiMessages = await convertDbToUIMessages(conversation.messages);

  return (
    <ChatArea
      conversationId={conversationId}
      title={conversation.title || "Chat"}
      initialMessages={uiMessages}
    />
  );
}
