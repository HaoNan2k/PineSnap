import { ChatLayoutWrapper } from "@/components/chat/layout/chat-layout-wrapper";
import { cookies } from "next/headers";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ChatLayoutServer>{children}</ChatLayoutServer>;
}

async function ChatLayoutServer({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <ChatLayoutWrapper defaultSidebarOpen={!isCollapsed}>
      {children}
    </ChatLayoutWrapper>
  );
}
