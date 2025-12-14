import { ChatLayoutWrapper } from "@/components/chat/layout/ChatLayoutWrapper";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatLayoutWrapper>{children}</ChatLayoutWrapper>;
}
