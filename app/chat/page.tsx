import { ChatArea } from "@/components/chat/components/ChatArea";

export default function Page() {
  return (
    <div className="flex flex-col h-full w-full">
       <ChatArea initialMessages={[]} title="New Chat" />
    </div>
  );
}
