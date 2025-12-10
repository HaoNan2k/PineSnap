"use client";

import { Sidebar } from "../../components/sidebar/Sidebar";
import { ChatArea } from "../../components/chat/ChatArea";
import { RightPanel } from "../../components/panels/RightPanel";
import Layout from "../../components/layout/Layout";
import { useState } from "react";
import {
  type Conversation,
} from "../../components/chat/chat";

export default function SocraticUPage() {

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  // 控制侧边栏是否打开
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 处理新建对话
  const handleNewChat = () => {
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: `New Chat ${conversations.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [...prev, newConversation]);
    setActiveConversationId(newConversation.id);
  };

  const handleConversationActivity = (id: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? { ...conversation, updatedAt: Date.now() }
          : conversation
      )
    );
  };

  // 计算当前选中的 conversation 对象
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  return (
    <div>
      <Layout
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        sidebar={
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onNewChat={handleNewChat}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        }
        chatArea={
          <ChatArea
            conversation={activeConversation}
            onConversationActivity={handleConversationActivity}
          />
        }
        rightPanel={<RightPanel />}
      />
    </div>
  );
}
