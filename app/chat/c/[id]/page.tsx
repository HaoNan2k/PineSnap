import { notFound } from "next/navigation";
import { getConversation } from "@/lib/db/conversation";
import { convertDbToUIMessages } from "@/lib/chat/converter";
import { ChatArea } from "@/components/chat/components/ChatArea";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // TODO: Replace with real user ID from auth
  const userId = "default-user";
  
  const conversation = await getConversation(id, userId);
  
  if (!conversation) {
    notFound();
  }

  const uiMessages = await convertDbToUIMessages(conversation.messages);

  return (
    <div className="flex flex-col h-full w-full">
      <ChatArea 
        initialConversationId={id}
        initialMessages={uiMessages} 
        title={conversation.title || "Chat"} 
      />
    </div>
  );
}
