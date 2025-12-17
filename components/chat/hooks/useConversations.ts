"use client";

import { useEffect, useMemo, useState } from "react";
import type { Conversation, Message } from "@/components/chat/types";
import type { ConversationGroup } from "@/components/chat/types";
import { groupByRecency } from "@/components/chat/utils/groupByRecency";
import { useRouter } from "next/navigation";

// 定义后端 API 返回的数据形状 (JSON serialized)
// 注意：不要在 Client Components/Hooks 中引用 Prisma 类型（会把 Prisma client 引入到前端 bundle）。
type ApiMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ApiConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ApiMessage[];
};

// --- Mappers ---

function mapRole(role: string): string {
  return role;
}

function mapMessage(apiMsg: ApiMessage): Message {
  return {
    id: apiMsg.id,
    role: mapRole(apiMsg.role),
    content: apiMsg.content,
    createdAt: new Date(apiMsg.createdAt),
  };
}

function mapConversation(apiConv: ApiConversation): Conversation {
  return {
    id: apiConv.id,
    title: apiConv.title,
    messages: Array.isArray(apiConv.messages)
      ? apiConv.messages.map(mapMessage)
      : [],
    createdAt: new Date(apiConv.createdAt),
    updatedAt: new Date(apiConv.updatedAt),
  };
}

export function useConversations() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. 初始化加载列表
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as ApiConversation[];
        setConversations(data.map(mapConversation));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // --- Derived State ---
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedConversations;
    return sortedConversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [sortedConversations, searchQuery]);

  const groups: ConversationGroup[] = useMemo(() => {
    return groupByRecency(filteredConversations);
  }, [filteredConversations]);

  // --- Actions ---

  const newChat = async () => {
    // Just navigate to /chat, the page will generate ID
    router.push("/chat");
  };

  const touchConversation = (id: string) => {
    // 乐观更新
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, updatedAt: new Date() } : c))
    );
  };

  const renameConversation = async (id: string, title: string) => {
    // 乐观更新
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );

    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteConversation = async (id: string) => {
    // 乐观更新
    setConversations((prev) => prev.filter((c) => c.id !== id));
    // We don't control active state here anymore, Layout should handle redirect if current is deleted
    // But we can try:
    router.push("/chat"); // Fallback to new chat if deleting

    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  return {
    conversations: sortedConversations,
    searchQuery,
    groups,
    isLoading,
    setSearchQuery,
    newChat,
    touchConversation,
    renameConversation,
    deleteConversation,
  };
}
