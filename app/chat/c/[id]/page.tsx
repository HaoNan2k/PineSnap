import { notFound, forbidden, unauthorized } from "next/navigation";
import { convertDbToUIMessages } from "@/lib/chat/converter";
import { ChatArea } from "@/components/chat/components/chat-area";
import { appRouter } from "@/server";
import { createContext } from "@/server/context";
import { TRPCError } from "@trpc/server";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await params;

  const ctx = await createContext();
  const caller = appRouter.createCaller(ctx);

  let conversation;
  try {
    conversation = await caller.conversation.get({ id: conversationId });
  } catch (error) {
    if (error instanceof TRPCError) {
      if (error.code === "UNAUTHORIZED") unauthorized();
      if (error.code === "NOT_FOUND") notFound();
      if (error.code === "FORBIDDEN") forbidden();
    }
    throw error;
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
