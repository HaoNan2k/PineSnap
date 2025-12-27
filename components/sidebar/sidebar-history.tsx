"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { groupByRecency } from "@/components/chat/utils/group-by-recency";
import type { Conversation } from "@/components/chat/types";
import type { AppRouter } from "@/server";
import { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ConversationList = RouterOutputs["conversation"]["list"];

interface SidebarItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}

const SidebarItem = ({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: SidebarItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);

  const handleSave = () => {
    if (editValue.trim() && editValue !== conversation.title) {
      onRename(conversation.id, editValue.trim());
    } else {
      setEditValue(conversation.title);
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

  if (isEditing) {
    return (
      <SidebarMenuItem>
        <div className="flex w-full items-center gap-2 rounded-md p-2">
          <input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full bg-transparent text-sm font-medium focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => onSelect(conversation.id)}
      >
        <span className="truncate">{conversation.title}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover={!isActive}>
            <MoreHorizontal />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            <span>重命名</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("确定要删除这个会话吗？")) {
                onDelete(conversation.id);
              }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>删除</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

interface SidebarHistoryProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}

export function SidebarHistory({
  searchQuery,
  onSearchQueryChange,
}: SidebarHistoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathname?.startsWith("/chat/c/")
    ? pathname.split("/")[3]
    : null;

  const { user, isLoading: isAuthLoading } = useAuth();

  const { data: conversations, isLoading: isDataLoading } =
    trpc.conversation.list.useQuery(undefined, { enabled: !!user });

  const utils = trpc.useUtils();

  const updateMutation = trpc.conversation.update.useMutation({
    onMutate: async (newData) => {
      await utils.conversation.list.cancel();
      const previous = utils.conversation.list.getData();

      utils.conversation.list.setData(
        undefined,
        (old: ConversationList | undefined) =>
          old?.map((c) =>
            c.id === newData.id ? { ...c, title: newData.title } : c
          )
      );

      return { previous };
    },
    onError: (err, newData, context) => {
      utils.conversation.list.setData(undefined, context?.previous);
      toast.error(err.message);
    },
    onSettled: () => {
      utils.conversation.list.invalidate();
    },
    onSuccess: () => {
      toast.success("重命名成功");
    },
  });

  const deleteMutation = trpc.conversation.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.conversation.list.cancel();
      const previous = utils.conversation.list.getData();

      utils.conversation.list.setData(
        undefined,
        (old: ConversationList | undefined) => old?.filter((c) => c.id !== id)
      );

      return { previous };
    },
    onError: (err, newData, context) => {
      utils.conversation.list.setData(undefined, context?.previous);
      toast.error(err.message);
    },
    onSettled: () => {
      utils.conversation.list.invalidate();
    },
    onSuccess: () => {
      toast.success("删除成功");
    },
  });

  const sortedConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations
      .map((c) => ({
        ...c,
        messages: [],
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      }))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedConversations;
    return sortedConversations.filter((c) =>
      c.title.toLowerCase().includes(q)
    );
  }, [sortedConversations, searchQuery]);

  const groups = useMemo(() => {
    return groupByRecency(filteredConversations);
  }, [filteredConversations]);

  const handleSelectConversation = (id: string) => {
    router.push(`/chat/c/${id}`);
  };

  const handleRename = async (id: string, title: string) => {
    updateMutation.mutate({ id, title });
  };

  const handleDelete = async (id: string) => {
    const isCurrentChat = pathname === `/chat/c/${id}`;
    deleteMutation.mutate({ id });
    if (isCurrentChat) {
      router.push("/chat");
    }
  };

  if (isAuthLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-surface-2 rounded-lg w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        请先登录查看历史
      </div>
    );
  }

  if (isDataLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[44, 32, 28, 64, 52].map((width) => (
            <div
              key={width}
              className="h-8 bg-surface-2 rounded-lg"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
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

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-2 scrollbar-track-transparent">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-fg-muted text-sm gap-2 opacity-60">
            <span>暂无历史记录</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {groups.map((group) => (
              <SidebarGroup key={group.id} className="px-2">
                <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold text-fg-faint uppercase tracking-wider">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((conversation) => (
                      <SidebarItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={activeId === conversation.id}
                        onSelect={handleSelectConversation}
                        onRename={handleRename}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
