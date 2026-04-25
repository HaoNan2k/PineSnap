"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { trpc } from "@/lib/trpc/react";
import type { ChatPart } from "@/lib/chat/types";

interface UseDiscussionChatParams {
  learningId: string;
  /** Stable id for the useChat instance — derived from learningId. */
  instanceId: string;
}

export interface UseDiscussionChatReturn {
  messages: UIMessage[];
  isStreaming: boolean;
  isReady: boolean;
  /** Send a free-text question. anchorMessageId is frozen at the call site. */
  sendDiscussion: (text: string, anchorMessageId: string) => Promise<void>;
  /** True once initial discussion data has loaded from the server. */
  initialLoaded: boolean;
}

/**
 * The "discussion useChat" — instance #2 inside the learning page.
 * Owns:
 *  - useChat instance bound to /api/learn/discussion
 *  - Initial messages hydrated from learning.getDiscussion tRPC query
 *  - prepareSendMessagesRequest that freezes the anchor passed in by
 *    the call site (NOT recomputed from current canvas state).
 *
 * Does NOT own:
 *  - Sidebar open/close state — owned by parent
 *  - Composer textarea value — owned by parent
 *
 * Why split the hook from the sidebar component: keeps learn-focus.tsx
 * clean (pure composition), allows the sidebar to be unit-tested in
 * isolation later.
 */
export function useDiscussionChat({
  learningId,
  instanceId,
}: UseDiscussionChatParams): UseDiscussionChatReturn {
  const discussionQuery = trpc.learning.getDiscussion.useQuery(
    { learningId },
    { retry: false, refetchOnWindowFocus: false }
  );

  // Cache the anchor for the in-flight submit so the server gets the
  // user-frozen value, not whatever the client state has drifted to.
  // Must be a ref, not state: setState is async and the transport's
  // prepareSendMessagesRequest runs synchronously inside sendMessage —
  // reading from state would capture null on the first submit.
  const pendingAnchorRef = useRef<string | null>(null);

  // Convert DB messages (Prisma rows) into UIMessage shape useChat understands.
  // The anchor is preserved as a custom field on the message so the message
  // list can render the disclosure tag.
  //
  // We explicitly type `raw` to avoid TS2589 (deep type instantiation) when
  // TypeScript tries to unfold Prisma's inferred Message type through the
  // tRPC query data shape.
  type RawDiscussionMessage = {
    id: string;
    role: string;
    parts: unknown;
    anchoredCanvasMessageId: string | null;
  };
  const initialMessages = useMemo<UIMessage[]>(() => {
    const raw = (discussionQuery.data?.messages ?? []) as RawDiscussionMessage[];
    return raw.map((m) => {
      const parts = Array.isArray(m.parts) ? (m.parts as unknown[]) : [];
      return {
        id: m.id,
        role: (m.role === "tool" ? "user" : m.role) as UIMessage["role"],
        anchoredCanvasMessageId: m.anchoredCanvasMessageId ?? undefined,
        parts: parts as UIMessage["parts"],
      } as UIMessage;
    });
  }, [discussionQuery.data]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/learn/discussion",
        prepareSendMessagesRequest: ({ messages }) => {
          const last = messages[messages.length - 1];
          const inputParts: ChatPart[] = [];
          if (last?.parts) {
            for (const p of last.parts) {
              if (p.type === "text") inputParts.push({ type: "text", text: p.text });
            }
          }
          return {
            body: {
              learningId,
              anchorMessageId: pendingAnchorRef.current ?? "",
              chatConversationId: discussionQuery.data?.chatConversationId ?? undefined,
              clientMessageId: last?.id ?? `discussion-${Date.now()}`,
              input: inputParts,
            },
          };
        },
      }),
    [learningId, discussionQuery.data?.chatConversationId]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: instanceId,
    messages: initialMessages,
    transport,
  });

  // useChat only reads `messages` prop on initial mount. The tRPC query
  // resolves after mount, so we hydrate once the first successful response
  // arrives. Guarded by a ref so we don't clobber live user submissions.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!discussionQuery.isSuccess) return;
    if (initialMessages.length === 0) {
      hydratedRef.current = true;
      return;
    }
    setMessages(initialMessages);
    hydratedRef.current = true;
  }, [discussionQuery.isSuccess, initialMessages, setMessages]);

  const sendDiscussion = useCallback(
    async (text: string, anchorMessageId: string) => {
      if (!text.trim() || !anchorMessageId) return;
      pendingAnchorRef.current = anchorMessageId;
      try {
        await sendMessage({
          role: "user",
          parts: [{ type: "text", text }],
        });
      } finally {
        pendingAnchorRef.current = null;
      }
    },
    [sendMessage]
  );

  return {
    messages,
    isStreaming: status === "streaming" || status === "submitted",
    isReady: status === "ready",
    sendDiscussion,
    initialLoaded: discussionQuery.isSuccess,
  };
}
