"use client";

import { Sidebar } from "../../components/sidebar/Sidebar";
import { ChatArea } from "../../components/chat/ChatArea";
import { RightPanel } from "../../components/panels/RightPanel";
import Layout from "../../components/layout/Layout";
import { useState } from "react";
import {
  type Conversation,
  type Message,
} from "../../components/chat/chat";

export default function SocraticUPage() {
  const defaultConversations: Conversation[] = [
    {
      id: "1",
      title: "Long Conversation Test",
      messages: [],
      createdAt: 1733333333333,
      updatedAt: 1733333333334,
    },
  ];

  const [conversations, setConversations] =
    useState<Conversation[]>(defaultConversations);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    defaultConversations[0].id
  );
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

  // 处理发送消息
  const handleSendMessage = (message: Message) => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.id === activeConversationId) {
          return {
            ...conversation,
            messages: [...conversation.messages, message],
            updatedAt: Date.now(),
          };
        }
        return conversation;
      })
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
            onSendMessage={handleSendMessage}
          />
        }
        rightPanel={<RightPanel />}
      />
    </div>
  );
}
