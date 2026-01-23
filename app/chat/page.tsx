import { ChatArea } from "@/components/chat/components/chat-area";
import { createContext } from "@/server/context";
import { redirect } from "next/navigation";

export default async function Page() {
  const ctx = await createContext();
  const { user } = ctx;

  // 虽然 middleware 会拦截，但为了逻辑完备性，这里也做个兜底
  if (!user) {
    redirect("/login");
  }

  const conversationId = crypto.randomUUID();
  return <ChatArea conversationId={conversationId} title="新对话" initialMessages={[]} />;
}
