import React, { useState, useRef, useEffect } from "react";
import type { Conversation, ConversationGroup } from "@/components/chat";
import { PanelLeftClose, SquarePen, MoreHorizontal, Pencil, Trash2, Check, X, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// --- Types ---

interface SidebarProps {
  groups: ConversationGroup[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

// --- Sub-Components ---

interface SidebarItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

const SidebarItem = ({ conversation, isActive, onSelect, onRename, onDelete }: SidebarItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当进入编辑模式时，自动聚焦并全选
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== conversation.title) {
      onRename(conversation.id, editValue.trim());
    } else {
      setEditValue(conversation.title); // Revert if empty or unchanged
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(conversation.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      handleSave();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      handleCancel();
    }
  };

  // Editing View
  if (isEditing) {
    return (
    <div className={cn(
      "group relative flex items-center gap-2 p-2 rounded-lg my-1 mx-2",
      "ring-1 ring-ring/50 bg-background" 
    )}>
      <input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-0 bg-transparent text-sm text-fg font-medium focus:outline-none px-0 py-0 h-auto leading-normal rounded-sm"
        onClick={(e) => e.stopPropagation()} 
      />
        <div className="flex items-center">
           {/* Visual cues for save/cancel can be added here if needed, 
               but Enter/Esc is standard for inline edit */}
        </div>
      </div>
    );
  }

  // Normal View
  return (
    <div
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "group relative flex items-center gap-2 p-2 rounded-lg my-1 mx-2 cursor-pointer transition-all duration-200",
        isActive 
          ? "bg-surface-2 text-fg shadow-sm" 
          : "text-fg-muted hover:bg-surface-2/50 hover:text-fg"
      )}
    >
      <div className="flex-1 min-w-0 pr-8">
        <h2 className="text-sm font-medium truncate select-none">
          {conversation.title}
        </h2>
      </div>

      {/* Action Menu - Only visible on hover or when open */}
      <div className={cn(
        "absolute right-1 top-1/2 -translate-y-1/2",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        // Force visible if dropdown is open (radix adds data-state)
        "data-[state=open]:opacity-100" 
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-3 rounded-md transition-colors focus:outline-none cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 shadow-lg rounded-xl">
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="cursor-pointer gap-2"
            >
              <Pencil className="h-4 w-4 text-fg-muted" />
              <span>重命名</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-2"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("确定要删除这个会话吗？")) {
                   onDelete(conversation.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span>删除</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};


// --- Main Component ---

export const Sidebar = ({
  groups,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onToggleSidebar,
  searchQuery,
  onSearchQueryChange,
  onRename,
  onDelete,
}: SidebarProps) => {
  return (
    <div className="h-full bg-surface border-r border-border flex flex-col w-64 md:w-72">
      {/* Header */}
      <div className="p-3 flex items-center justify-between">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-fg-muted hover:text-fg hover:bg-surface-2 rounded-lg transition-colors"
          title="Close Sidebar"
        >
          <PanelLeftClose size={20} />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 text-fg-muted hover:text-fg hover:bg-surface-2 rounded-lg transition-colors"
          title="New Chat"
        >
          <SquarePen size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted/60 group-focus-within:text-fg-muted transition-colors" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="搜索历史记录..."
            className="w-full pl-9 pr-3 py-1.5 bg-surface-2/50 hover:bg-surface-2 focus:bg-surface-2 border border-transparent focus:border-border/50 rounded-lg text-sm text-fg placeholder:text-fg-muted/60 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-2 scrollbar-track-transparent">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-fg-muted text-sm gap-2 opacity-60">
             <span>暂无历史记录</span>
          </div>
        ) : (
          <div className="pb-4">
            {groups.map((group) => (
              <div key={group.id} className="mb-6">
                <div className="px-4 mb-2 text-xs font-semibold text-fg-faint uppercase tracking-wider">
                  {group.label}
                </div>
                <div>
                  {group.items.map((conversation) => (
                    <SidebarItem
                      key={conversation.id}
                      conversation={conversation}
                      isActive={activeConversationId === conversation.id}
                      onSelect={onSelectConversation}
                      onRename={onRename}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
