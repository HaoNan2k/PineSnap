import {
  ModelMessage,
  UserContent,
  AssistantContent,
  ToolContent,
  ContentPart,
  ToolSet,
  UIMessage,
} from "ai";
import { ChatPart } from "./types";
import { parseMessageParts } from "./utils";
import { fileStorage } from "@/lib/storage";
import { fileContentResolver } from "@/lib/files/content-resolver";
import { toToolResultOutput } from "./tool-result-output";

// --- DB -> Model (Context Construction) ---

/**
 * Converts persisted DB messages to AI SDK ModelMessages.
 * Handles role mapping and content hydration (e.g. resolving file URLs).
 */
export async function dbToModelMessages(
  dbMessages: Array<{ role: string; parts: unknown }>
): Promise<ModelMessage[]> {
  const modelMessages: ModelMessage[] = [];

  for (const m of dbMessages) {
    const chatParts = parseMessageParts(m.parts);

    // Heuristic: If a message contains tool results, treat it as a ToolMessage (role: 'tool')
    // regardless of the DB role, as Prisma might not support 'tool' role yet.
    if (chatParts.some((p) => p.type === "tool-result")) {
      modelMessages.push({
        role: "tool",
        content: chatPartsToToolContent(chatParts),
      });
      continue;
    }

    // Standard mapping
    if (m.role === "user") {
      modelMessages.push({
        role: "user",
        content: await chatPartsToUserContent(chatParts),
      });
    } else if (m.role === "assistant") {
      modelMessages.push({
        role: "assistant",
        content: chatPartsToAssistantContent(chatParts),
      });
    } else if (m.role === "system") {
      const isTextPart = (
        p: ChatPart
      ): p is Extract<ChatPart, { type: "text" }> => p.type === "text";
      const text = chatParts
        .filter(isTextPart)
        .map((p) => p.text)
        .join("\n");
      modelMessages.push({ role: "system", content: text });
    }
  }

  return modelMessages;
}

function isTextLikeMediaType(mediaType: string): boolean {
  return (
    mediaType.startsWith("text/") ||
    mediaType === "application/json" ||
    mediaType === "application/xml" ||
    mediaType === "application/x-yaml"
  );
}

function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, maxChars), truncated: true };
}

async function chatPartsToUserContent(parts: ChatPart[]): Promise<UserContent> {
  const content: UserContent = [];
  for (const p of parts) {
    if (p.type === "text") {
      content.push({ type: "text", text: p.text });
    } else if (p.type === "file") {
      // Bytes-first for images: avoid passing local/private URLs to model providers.
      if (p.mediaType.startsWith("image/")) {
        try {
          const bytes = await fileContentResolver.readBytes(p.ref);
          content.push({ type: "image", image: bytes, mediaType: p.mediaType });
        } catch {
          // Missing/invalid ref should not break the whole chat request.
          content.push({
            type: "text",
            text: `附件《${p.name}》不可用（文件缺失或无权限）。`,
          });
        }
        continue;
      }

      // Text-like files: extract and inject as bounded text (with truncation).
      if (isTextLikeMediaType(p.mediaType)) {
        try {
          const bytes = await fileContentResolver.readBytes(p.ref);
          const decoded = Buffer.from(bytes).toString("utf-8");
          const { text, truncated } = truncateText(decoded, 20_000);
          const header = `附件《${p.name}》(${p.mediaType})：`;
          const footer = truncated ? "\n\n[内容已截断]" : "";
          content.push({
            type: "text",
            text: `${header}\n\`\`\`\n${text}\n\`\`\`${footer}`,
          });
        } catch {
          content.push({
            type: "text",
            text: `附件《${p.name}》不可用（文件缺失或无权限）。`,
          });
        }
        continue;
      }

      // Other binary files are persisted for replay but omitted from prompt by default.
      // (UI replay uses resolveUrl on DB→UI conversion.)
    }
  }
  return content;
}

function chatPartsToAssistantContent(parts: ChatPart[]): AssistantContent {
  const content: AssistantContent = [];
  for (const p of parts) {
    if (p.type === "text") {
      content.push({ type: "text", text: p.text });
    } else if (p.type === "tool-call") {
      content.push({
        type: "tool-call",
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        input: p.input,
      });
    }
  }
  return content;
}

function chatPartsToToolContent(parts: ChatPart[]): ToolContent {
  const content: ToolContent = [];
  for (const p of parts) {
    if (p.type === "tool-result") {
      content.push({
        type: "tool-result",
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        output: p.output,
      });
    }
  }
  return content;
}

// --- SDK Output -> DB (Persistence) ---

/**
 * Converts AI SDK StepResult content to ChatPart[] for persistence.
 */
export function sdkToChatParts(
  content: Array<ContentPart<ToolSet>>
): ChatPart[] {
  const parts: ChatPart[] = [];

  for (const p of content) {
    if (p.type === "text") {
      parts.push({ type: "text", text: p.text });
    } else if (p.type === "tool-call") {
      parts.push({
        type: "tool-call",
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        input: p.input,
      });
    } else if (p.type === "tool-result") {
      parts.push({
        type: "tool-result",
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        output: toToolResultOutput(p.output),
      });
    } else if (p.type === "tool-error") {
      let value: string;
      try {
        value = JSON.stringify(p.error);
      } catch {
        value = String(p.error);
      }
      parts.push({
        type: "tool-result",
        toolCallId: p.toolCallId,
        toolName: p.toolName,
        output: { type: "error-text", value },
        isError: true,
      });
    } else if (p.type === "source") {
      // Persist sources for replay/audit. (Provider may return sources as part of content.)
      const s = p;
      if (s.sourceType === "url") {
        parts.push({
          type: "source",
          sourceType: "url",
          id: s.id,
          url: s.url,
          ...(s.title ? { title: s.title } : {}),
        });
      } else if (s.sourceType === "document") {
        parts.push({
          type: "source",
          sourceType: "document",
          id: s.id,
          ...(typeof s.title === "string" ? { title: s.title } : {}),
          ...(typeof s.mediaType === "string" ? { mediaType: s.mediaType } : {}),
          ...(typeof s.filename === "string" ? { filename: s.filename } : {}),
        });
      }
    }
    // Note: We intentionally ignore generated file parts and reasoning output for now.
  }

  return parts;
}

// --- DB -> UI (Rendering) ---

/**
 * Converts DB messages to AI SDK UIMessages for frontend rendering.
 */
export async function convertDbToUIMessages(
  dbMessages: Array<{
    id: string;
    role: string;
    parts: unknown;
    createdAt: Date;
  }>
): Promise<UIMessage[]> {
  const uiMessages: UIMessage[] = [];

  for (const m of dbMessages) {
    const chatParts = parseMessageParts(m.parts);
    const uiParts: UIMessage["parts"] = [];

    for (const p of chatParts) {
      if (p.type === "text") {
        uiParts.push({ type: "text", text: p.text });
      } else if (p.type === "file") {
        let url = "";
        try {
          url = await fileStorage.resolveUrl(p.ref);
        } catch {
          // Missing/legacy refs must not break page rendering.
          // UI currently renders only filenames, so empty url is acceptable.
          url = "";
        }
        uiParts.push({
          type: "file",
          mediaType: p.mediaType,
          filename: p.name,
          url,
        });
      } else if (p.type === "source") {
        if (p.sourceType === "url" && p.url) {
          uiParts.push({
            type: "source-url",
            sourceId: p.id,
            url: p.url,
            ...(p.title ? { title: p.title } : {}),
          });
        } else if (
          p.sourceType === "document" &&
          p.title &&
          p.mediaType
        ) {
          uiParts.push({
            type: "source-document",
            sourceId: p.id,
            mediaType: p.mediaType,
            title: p.title,
            ...(p.filename ? { filename: p.filename } : {}),
          });
        }
      }
    }

    uiMessages.push({
      id: m.id,
      role: m.role as UIMessage["role"],
      parts: uiParts,
      metadata: { createdAt: m.createdAt.toISOString() },
    });
  }

  return uiMessages;
}
