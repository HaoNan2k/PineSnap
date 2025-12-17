"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "@/components/layout/Layout";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { RightPanel } from "@/components/panels/RightPanel";
import { useConversations } from "@/components/chat/hooks/useConversations";

export function ChatLayoutWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string | undefined;

  const {
    groups,
    searchQuery,
    setSearchQuery,
    newChat,
    renameConversation,
    deleteConversation,
  } = useConversations();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleSelectConversation = (id: string) => {
      router.push(`/chat/c/${id}`);
  };

  return (
    <Layout
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      sidebar={
        <Sidebar
          groups={groups}
          activeConversationId={activeId || ""}
          onSelectConversation={handleSelectConversation}
          onNewChat={newChat}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onRename={renameConversation}
          onDelete={deleteConversation}
        />
      }
      chatArea={children}
      rightPanel={<RightPanel />}
    />
  );
}
