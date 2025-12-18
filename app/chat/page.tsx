import { ChatArea } from "@/components/chat/components/ChatArea";
import { generateUUID } from "@/lib/utils";

export default function Page() {
  const id = generateUUID();
  
  return (
    <div className="flex flex-col h-full w-full">
       <ChatArea key={id} initialMessages={[]} title="新对话" />
    </div>
  );
}
