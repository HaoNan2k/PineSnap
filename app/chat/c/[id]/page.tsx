import { notFound } from "next/navigation";
import { forbidden, unauthorized } from "next/navigation";
import { getConversationWithAccessCheck } from "@/lib/db/conversation";
import { convertDbToUIMessages } from "@/lib/chat/converter";
import { ChatArea } from "@/components/chat/components/chat-area";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await params;

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    unauthorized();
  }

  const result = await getConversationWithAccessCheck(conversationId, userId);
  if (!result.ok) {
    if (result.status === 404) notFound();
    forbidden();
  }

  const uiMessages = await convertDbToUIMessages(result.conversation.messages);

  return (
    <ChatArea
      conversationId={conversationId}
      title={result.conversation.title || "Chat"}
      initialMessages={uiMessages}
    />
  );
}
