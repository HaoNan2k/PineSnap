"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { useMemo } from "react";
import { MessageList } from "@/components/chat/components/message-list";
import { MultimodalInput } from "@/components/chat/components/multimodal-input";
import { isChatBusy } from "@/components/chat/types";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Sparkles,
  Code,
  FileText,
  Lightbulb,
} from "lucide-react";
import { ChatPart } from "@/lib/chat/types";
import { Attachment } from "@/components/chat/components/preview-attachment";
import { isRecord } from "@/lib/utils";
import { useDataStream } from "@/components/data-stream-provider";
import { UserMenu } from "@/components/user/user-menu";

const suggestions = [
  { icon: Code, text: "帮我写一段 React 代码", color: "text-gray-600" },
  { icon: FileText, text: "总结这篇文章的要点", color: "text-gray-600" },
  { icon: Lightbulb, text: "给我一些创业点子", color: "text-gray-600" },
  { icon: Sparkles, text: "帮我优化这段文案", color: "text-gray-600" },
];

function hasContent(m: unknown): m is { content: string } {
  return (
    typeof m === "object" &&
    m !== null &&
    "content" in m &&
    typeof (m as { content: unknown }).content === "string"
  );
}

function hasCreatedAt(m: unknown): m is { createdAt: Date | number | string } {
  return typeof m === "object" && m !== null && "createdAt" in m;
}

function getFileRefFromProviderMetadata(meta: unknown): string | undefined {
  if (!isRecord(meta)) return undefined;
  const attachment = meta["attachment"];
  if (!isRecord(attachment)) return undefined;
  const ref = attachment["ref"];
  return typeof ref === "string" && ref.length > 0 ? ref : undefined;
}

export function ChatArea({
  conversationId,
  title,
  initialMessages,
}: {
  conversationId: string;
  title: string;
  initialMessages: UIMessage[];
}) {
  const { setDataStream } = useDataStream();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages: currentMessages }) => {
          const last = currentMessages[currentMessages.length - 1];
          const clientMessageId = last.id;

          const input: ChatPart[] = [];
          if (last.parts && last.parts.length > 0) {
            for (const p of last.parts) {
              if (p.type === "text") {
                input.push({ type: "text", text: p.text });
              } else if (p.type === "file") {
                // Try to extract ref from providerMetadata (injected during handleSend)
                // If not found, it might be a Data URL (which we shouldn't send, but for now we fallback/ignore)
                const ref =
                  getFileRefFromProviderMetadata(p.providerMetadata) ??
                  (typeof p.url === "string" && !p.url.startsWith("data:")
                    ? p.url
                    : undefined);

                if (ref) {
                  input.push({
                    type: "file",
                    name: p.filename ?? "文件",
                    mediaType: p.mediaType ?? "application/octet-stream",
                    ref,
                  });
                }
              }
            }
          } else if (hasContent(last)) {
            input.push({ type: "text", text: last.content });
          }

          return {
            body: {
              conversationId,
              clientMessageId,
              input,
            },
          };
        },
      }),
    [conversationId]
  );

  const { messages, sendMessage, status, addToolResult } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    dataPartSchemas: {
      conversationId: z.object({ id: z.string() }),
      titleUpdated: z.object({ id: z.string(), title: z.string() }),
    },
    onData: (dataPart) => {
      if (dataPart.type === "data-conversationId") {
        if (!isRecord(dataPart.data) || typeof dataPart.data.id !== "string")
          return;
        const newId = dataPart.data.id;
        if (window.location.pathname === "/chat") {
          window.history.replaceState({}, "", `/chat/c/${newId}`);
        }
        setDataStream((prev) => [
          ...prev,
          { type: "data-conversationId", data: { id: newId } },
        ]);
      } else if (dataPart.type === "data-titleUpdated") {
        // Push to data stream for sidebar handler
        const data = dataPart.data;
        if (
          isRecord(data) &&
          typeof data.id === "string" &&
          typeof data.title === "string"
        ) {
          const updatedId = data.id;
          const updatedTitle = data.title;
          setDataStream((prev) => [
            ...prev,
            {
              type: "data-titleUpdated" as const,
              data: { id: updatedId, title: updatedTitle },
            },
          ]);
        }
      }
    },
  });

  const mappedMessages = useMemo(
    () =>
      messages.map((m) => {
        let content = "";
        const parts: ChatPart[] = [];
        const attachments: Attachment[] = [];

        if (m.parts && m.parts.length > 0) {
          // 1. Extract plain text content for backward compatibility
          const texts = m.parts
            .filter(
              (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
            )
            .map((p) => p.text);
          content = texts.join("\n");

          // 2. Map all valid parts to ChatPart structure
          m.parts.forEach((p) => {
            if (p.type === "text") {
              parts.push({ type: "text", text: p.text });
            } else if (p.type === "file") {
              const ref = getFileRefFromProviderMetadata(p.providerMetadata);
              const mediaType = p.mediaType ?? "application/octet-stream";
              const name = p.filename ?? "文件";

              // Rendering path: keep both url (fast initial render) and stable ref (refresh capability).
              attachments.push({
                name,
                mediaType,
                url: typeof p.url === "string" ? p.url : "",
                ref: ref ?? "",
              });

              // Prompt-sending path: ONLY accept stable storage refs.
              // Never treat signed URLs as refs.
              if (ref) {
                parts.push({
                  type: "file",
                  name,
                  mediaType,
                  ref,
                });
              }
            }
          });
        } else if (hasContent(m)) {
          content = m.content;
          parts.push({ type: "text", text: m.content });
        }

        let createdAt = new Date();
        if (hasCreatedAt(m)) {
          createdAt =
            m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
        } else if (
          typeof m === "object" &&
          m !== null &&
          "metadata" in m &&
          typeof (m as { metadata?: unknown }).metadata === "object" &&
          (m as { metadata?: Record<string, unknown> }).metadata !== null &&
          typeof (m as { metadata?: Record<string, unknown> }).metadata
            ?.createdAt === "string"
        ) {
          createdAt = new Date(
            (m as { metadata: { createdAt: string } }).metadata.createdAt
          );
        }

        return {
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: content,
          parts: parts, // Pass structured parts
          attachments,
          uiParts: m.parts,
          createdAt: createdAt,
        };
      }),
    [messages]
  );

  const handleSend = async (content: string, attachments: Attachment[]) => {
    if (isChatBusy(status)) return;

    // Construct FileUIParts from attachments
    const filteredAttachments = attachments.filter((att) => {
      if (att.ref) return true;
      if (typeof att.url !== "string") return false;
      return !att.url.startsWith("data:");
    });

    const fileParts: FileUIPart[] = filteredAttachments.map((att) => ({
      type: "file",
      mediaType: att.mediaType ?? "application/octet-stream",
      url: att.url,
      filename: att.name,
      ...(att.ref ? { providerMetadata: { attachment: { ref: att.ref } } } : {}),
    }));

    const textPart = content.trim()
      ? [{ type: "text" as const, text: content }]
      : [];

    if (textPart.length === 0 && fileParts.length === 0) {
      return;
    }

    await sendMessage({
      role: "user",
      parts: [...textPart, ...fileParts],
    });
  };

  const isAssistantTyping = isChatBusy(status);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="rounded-xl" />
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <UserMenu />
      </header>

      {/* Messages Area */}
      {mappedMessages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center overflow-y-auto px-4 md:px-6 py-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            你好，有什么可以帮你？
          </h1>
          <p className="text-gray-500 mb-8 max-w-md">
            我是你的 AI 助手，可以帮你回答问题、撰写文案、编写代码等。
          </p>

          {/* Suggestion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSend(suggestion.text, [])}
                className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <suggestion.icon className={`w-5 h-5 ${suggestion.color}`} />
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  {suggestion.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <MessageList
          messages={mappedMessages}
          isAssistantTyping={isAssistantTyping}
          addToolResult={addToolResult}
        />
      )}

      {/* Input Area */}
      <MultimodalInput onSend={handleSend} disabled={isAssistantTyping} />
    </div>
  );
}
