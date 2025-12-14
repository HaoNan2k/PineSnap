import { v4 as uuidv4 } from "uuid";
import { ChatArea } from "@/components/chat/components/ChatArea";

export default async function Page() {
  const id = uuidv4();
  
  return (
    <div className="flex flex-col h-full w-full">
       <ChatArea id={id} initialMessages={[]} title="New Chat" />
    </div>
  );
}
