"use client";

import { useEffect, useMemo, useState } from "react";
import type { Conversation, Message, MessageRole } from "@/components/chat/types";
import type { ConversationGroup } from "@/components/chat/types";
import { groupByRecency } from "@/components/chat/utils/groupByRecency";

// Import types from our generated Prisma client
// 注意：因为是 JSON 传输，日期字段在传输中是 string，但在 Prisma 类型定义里是 Date。
// 我们需要定义一个 "Network Type" 或者直接断言。
import type { Conversation as PrismaConversation, Message as PrismaMessage, Role } from "@prisma/client";

// 定义后端 API 返回的数据形状 (JSON serialized)
// 基本上就是 Prisma 类型，但 Date 字段变成了 string
type ApiMessage = Omit<PrismaMessage, "createdAt"> & { createdAt: string };
type ApiConversation = Omit<PrismaConversation, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  messages?: ApiMessage[];
};

// --- Mappers ---

function mapRole(role: Role | string): MessageRole {
  // 简单映射，以后如果 Role 变复杂了可以在这里处理
  return role as MessageRole;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
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

  // 2. 当选中 ID 变化时，加载该会话的完整详情（包含消息）
  useEffect(() => {
    if (!activeConversationId) return;

    async function loadDetail() {
      try {
        const res = await fetch(`/api/conversations/${activeConversationId}`);
        if (!res.ok) return; // 可能是 404
        const data = (await res.json()) as ApiConversation;
        
        const fullConv = mapConversation(data);
        
        setConversations((prev) =>
          prev.map((c) => (c.id === fullConv.id ? fullConv : c))
        );
      } catch (err) {
        console.error(err);
      }
    }

    loadDetail();
  }, [activeConversationId]);


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

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId);
  }, [conversations, activeConversationId]);


  // --- Actions ---

  const newChat = async () => {
    try {
      const res = await fetch("/api/conversations", { method: "POST" });
      if (!res.ok) throw new Error("Failed create");
      const data = (await res.json()) as ApiConversation;
      const newConv = mapConversation(data);

      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    } catch (err) {
      console.error(err);
    }
  };

  const ensureConversation = async (id: string) => {
    if (conversations.some((c) => c.id === id)) {
      setActiveConversationId(id);
      return;
    }
    await newChat();
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
    const prevActiveId = activeConversationId;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (prevActiveId === id) setActiveConversationId("");

    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
    }
  };

  return {
    conversations: sortedConversations,
    activeConversationId,
    activeConversation,
    searchQuery,
    groups,
    isLoading,
    setActiveConversationId,
    setSearchQuery,
    newChat,
    ensureConversation,
    touchConversation,
    renameConversation,
    deleteConversation,
  };
}
