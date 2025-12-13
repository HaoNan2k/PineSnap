"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatArea, useConversations } from "@/components/chat";
import { RightPanel } from "@/components/panels/RightPanel";
import Layout from "@/components/layout/Layout";
import { useEffect, useState } from "react";

const UI_STORAGE_KEY = "socraticu.ui";
const UI_STORAGE_VERSION = 1 as const;

export default function SocraticUPage() {
  const {
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    groups,
    searchQuery,
    setSearchQuery,
    newChat,
    ensureConversation,
    touchConversation,
  } = useConversations();

  // 1. 默认状态：true (服务端和客户端首帧一致)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 2. 客户端挂载后，读取本地存储恢复状态
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(UI_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version === UI_STORAGE_VERSION && typeof parsed.sidebarOpen === "boolean") {
          setIsSidebarOpen(parsed.sidebarOpen);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // 3. 状态变更时，写入本地存储
  useEffect(() => {
    try {
      window.localStorage.setItem(
        UI_STORAGE_KEY,
        JSON.stringify({ version: UI_STORAGE_VERSION, sidebarOpen: isSidebarOpen })
      );
    } catch {
      // ignore
    }
  }, [isSidebarOpen]);

  return (
    <Layout
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      sidebar={
        <Sidebar
          groups={groups}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewChat={newChat}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      }
      chatArea={
        <ChatArea
          conversation={activeConversation}
          onConversationActivity={touchConversation}
          onStartConversation={ensureConversation}
        />
      }
      rightPanel={<RightPanel />}
    />
  );
}
