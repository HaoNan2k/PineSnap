"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/react";
import { LearningMetaCard } from "@/components/debug/learning-meta-card";
import { TimelineCanvas } from "@/components/debug/timeline-canvas";
import type { DebugMessage } from "@/components/debug/message-card";

// Minimal shapes that mirror the debug router output. Defining them locally
// prevents the trpc-inferred deeply-nested type from leaking into JSX prop
// inference (which TS gives up on with TS2589).
type RawMessage = {
  id: string;
  conversationId: string;
  role: string;
  parts: unknown;
  createdAt: string;
  clientMessageId: string | null;
  anchoredCanvasMessageId: string | null;
  deletedAt: string | null;
};

type RawConversation = {
  conversation: {
    id: string;
    kind: "canvas" | "chat";
    messages: RawMessage[];
  };
};

type RawLearning = {
  id: string;
  plan: string | null;
  clarify: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  resources: Array<{
    resource: { id: string; title: string; sourceType: string };
  }>;
  conversations: RawConversation[];
};

type DetailPayload = {
  learning: RawLearning;
  user: { id: string; email: string | null } | null;
  truncated: boolean;
  messageCap: number;
};

export default function LearningDebugPage({
  params,
}: {
  params: Promise<{ learningId: string }>;
}) {
  const { learningId } = use(params);
  const query = trpc.debug.getLearningDetail.useQuery({ id: learningId });

  if (query.isLoading) {
    return (
      <div className="px-4 py-6 font-mono text-sm text-gray-500">loading…</div>
    );
  }

  if (query.error) {
    return (
      <div className="px-4 py-6 font-mono text-sm">
        <div className="border border-red-300 bg-red-50 text-red-900 rounded p-3 whitespace-pre-wrap">
          {query.error.message}
        </div>
      </div>
    );
  }

  if (!query.data) return null;

  // Cast through unknown to detach the heavy trpc inferred type from JSX.
  const data = query.data as unknown as DetailPayload;
  const { learning, user, truncated, messageCap } = data;

  const conversations = learning.conversations.map((lc) => ({
    id: lc.conversation.id,
    kind: lc.conversation.kind,
    messages: lc.conversation.messages.map<DebugMessage>((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role as DebugMessage["role"],
      parts: m.parts,
      createdAt: m.createdAt,
      clientMessageId: m.clientMessageId,
      anchoredCanvasMessageId: m.anchoredCanvasMessageId,
      deletedAt: m.deletedAt,
    })),
  }));

  return (
    <div className="px-4 py-4 space-y-6">
      <LearningMetaCard
        learning={learning}
        user={user}
        truncated={truncated}
        messageCap={messageCap}
      />
      <TimelineCanvas conversations={conversations} />
    </div>
  );
}
