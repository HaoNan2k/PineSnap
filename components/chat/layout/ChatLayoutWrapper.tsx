"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/layout/Layout";
import { RightPanel } from "@/components/panels/RightPanel";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { SidebarHistory } from "@/components/sidebar/SidebarHistory";
import { PanelLeftClose, SquarePen } from "lucide-react";

export function ChatLayoutWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNewChat = () => {
    router.push("/chat");
  };

  return (
    <DataStreamProvider>
      <DataStreamHandler />
      <Layout
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        sidebar={
          <div className="h-full bg-surface border-r border-border flex flex-col w-64 md:w-72">
            {/* Header */}
            <div className="p-3 flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-fg-muted hover:text-fg hover:bg-surface-2 rounded-lg transition-colors"
                title="关闭侧边栏"
              >
                <PanelLeftClose size={20} />
              </button>
              <button
                onClick={handleNewChat}
                className="p-2 text-fg-muted hover:text-fg hover:bg-surface-2 rounded-lg transition-colors"
                title="新建对话"
              >
                <SquarePen size={20} />
              </button>
            </div>

            {/* SidebarHistory with SWR */}
            <SidebarHistory
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
          </div>
        }
        chatArea={children}
        rightPanel={<RightPanel />}
      />
    </DataStreamProvider>
  );
}
