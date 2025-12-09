import type { Conversation } from "../chat/chat";
import { PanelLeftClose, SquarePen } from "lucide-react";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
}

export const Sidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onToggleSidebar,
}: SidebarProps) => {
  return (
    // 移除 w-64，由 Layout 控制宽度
    <div className="h-full bg-gray-50 p-4 flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-gray-500 hover:bg-gray-200 rounded-md transition-colors"
          title="Close Sidebar"
        >
          <PanelLeftClose size={20} />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 text-gray-500 hover:bg-gray-200 rounded-md transition-colors"
          title="New Chat"
        >
          <SquarePen size={20} />
        </button>
      </div>

      {/* 列表区域：占据剩余空间，内容多了可以滚动 */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`
              cursor-pointer p-2 mb-1 rounded-md transition-colors
              ${
                activeConversationId === conversation.id
                  ? "bg-indigo-100 text-indigo-900"
                  : "hover:bg-gray-200 text-gray-700"
              }
            `}
            onClick={() => {
              onSelectConversation(conversation.id);
            }}
          >
            {/* truncate: 标题太长自动显示省略号 */}
            <h2 className="text-sm font-medium truncate">
              {conversation.title}
            </h2>
          </div>
        ))}
      </div>
    </div>
  );
};
