import { ChatArea } from "@/components/chat/components/chat-area";

export default function Page() {
  const conversationId = crypto.randomUUID();
  return <ChatArea conversationId={conversationId} title="新对话" initialMessages={[]} />;
}
