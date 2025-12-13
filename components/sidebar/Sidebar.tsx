import type { ConversationGroup } from "@/components/chat";
import { PanelLeftClose, SquarePen } from "lucide-react";

interface SidebarProps {
  groups: ConversationGroup[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}

export const Sidebar = ({
  groups,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onToggleSidebar,
  searchQuery,
  onSearchQueryChange,
}: SidebarProps) => {
  return (
    // 移除 w-64，由 Layout 控制宽度
    <div className="h-full bg-bg p-4 flex flex-col text-fg">
      {/* 顶部工具栏 */}
      <div className="flex justify-between items-center">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-fg-muted hover:bg-surface-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="Close Sidebar"
          aria-label="Close Sidebar"
        >
          <PanelLeftClose size={20} />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 text-fg-muted hover:bg-surface-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="New Chat"
          aria-label="New Chat"
        >
          <SquarePen size={20} />
        </button>
      </div>

      <div className="mt-4">
        <input
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search"
          className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* 列表区域：占据剩余空间，内容多了可以滚动 */}
      <div className="flex-1 overflow-y-auto mt-4 space-y-4">
        {groups.length === 0 ? (
          <div className="text-sm text-fg-muted px-1">No chats</div>
        ) : null}

        {groups.map((group) => (
          <div key={group.id}>
            <div className="px-1 mb-2 text-xs uppercase tracking-wider text-fg-faint">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`
                    w-full text-left p-2 rounded-md transition-colors
                    ${
                      activeConversationId === conversation.id
                        ? "bg-surface-2 text-fg"
                        : "hover:bg-surface-2 text-fg-muted"
                    }
                  `}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                  }}
                  aria-current={
                    activeConversationId === conversation.id ? "page" : undefined
                  }
                >
                  <h2 className="text-sm font-medium truncate">
                    {conversation.title}
                  </h2>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
