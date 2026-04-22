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
import { isToolResultOutput } from "./tool-result-output";
import { isRecord } from "@/lib/utils";

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
    } else if (m.role === "tool") {
      modelMessages.push({
        role: "tool",
        content: chatPartsToToolContent(chatParts),
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
  // Collect file parts that need byte resolution, resolve all in parallel.
  const fileParts = parts.filter(
    (p): p is Extract<ChatPart, { type: "file" }> =>
      p.type === "file" && (p.mediaType.startsWith("image/") || isTextLikeMediaType(p.mediaType))
  );
  const fileResults = await Promise.all(
    fileParts.map(async (p) => {
      try {
        return { ref: p.ref, bytes: await fileContentResolver.readBytes(p.ref), error: false as const };
      } catch {
        return { ref: p.ref, bytes: null, error: true as const };
      }
    })
  );
  const fileByteMap = new Map(fileResults.map((r) => [r.ref, r]));

  const content: UserContent = [];
  for (const p of parts) {
    if (p.type === "text") {
      content.push({ type: "text", text: p.text });
    } else if (p.type === "file") {
      // Bytes-first for images: avoid passing local/private URLs to model providers.
      if (p.mediaType.startsWith("image/")) {
        const result = fileByteMap.get(p.ref);
        if (result && !result.error && result.bytes) {
          content.push({ type: "image", image: result.bytes, mediaType: p.mediaType });
        } else {
          content.push({
            type: "text",
            text: `附件《${p.name}》不可用（文件缺失或无权限）。`,
          });
        }
        continue;
      }

      // Text-like files: extract and inject as bounded text (with truncation).
      if (isTextLikeMediaType(p.mediaType)) {
        const result = fileByteMap.get(p.ref);
        if (result && !result.error && result.bytes) {
          const decoded = Buffer.from(result.bytes).toString("utf-8");
          const { text, truncated } = truncateText(decoded, 20_000);
          const header = `附件《${p.name}》(${p.mediaType})：`;
          const footer = truncated ? "\n\n[内容已截断]" : "";
          content.push({
            type: "text",
            text: `${header}\n\`\`\`\n${text}\n\`\`\`${footer}`,
          });
        } else {
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
  content: string | Array<ContentPart<ToolSet>>
): ChatPart[] {
  const parts: ChatPart[] = [];

  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

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
  // Pre-resolve all file URLs in parallel to avoid sequential awaits.
  const allParsed = dbMessages.map((m) => ({ ...m, chatParts: parseMessageParts(m.parts) }));
  const fileRefs = new Set<string>();
  for (const { chatParts } of allParsed) {
    for (const p of chatParts) {
      if (p.type === "file") fileRefs.add(p.ref);
    }
  }
  const urlResults = await Promise.all(
    [...fileRefs].map(async (ref) => {
      try {
        return { ref, url: await fileStorage.resolveUrl(ref) };
      } catch {
        return { ref, url: "" };
      }
    })
  );
  const urlMap = new Map(urlResults.map((r) => [r.ref, r.url]));

  const uiMessages: UIMessage[] = [];

  for (const m of allParsed) {
    const chatParts = m.chatParts;
    const uiParts: UIMessage["parts"] = [];

    // Tool messages are persisted separately in DB (Role.tool), but in UI we want
    // tool results to be rendered as part of the originating assistant message,
    // not as an extra duplicated "assistant" bubble.
    if (m.role === "tool") {
      for (const p of chatParts) {
        if (p.type !== "tool-result") continue;

        const outputValue: unknown = (() => {
          const out = p.output;
          if (isToolResultOutput(out)) {
            if (out.type === "json" || out.type === "error-json") return out.value;
            if (out.type === "text" || out.type === "error-text") return out.value;
          }
          return out;
        })();

        // Find the most recent assistant UI message that has the matching tool call.
        let merged = false;
        for (let i = uiMessages.length - 1; i >= 0; i--) {
          const candidate = uiMessages[i];
          if (candidate.role !== "assistant") continue;

          const parts = candidate.parts;
          for (let j = 0; j < parts.length; j++) {
            const part = parts[j];
            if (!isRecord(part)) continue;
            const rec = part as Record<string, unknown>;
            if (rec["type"] !== `tool-${p.toolName}`) continue;
            if (rec["toolCallId"] !== p.toolCallId) continue;

            // Patch the tool part in place: keep input, attach output / error.
            parts[j] = {
              ...rec,
              state: p.isError ? "output-error" : "output-available",
              ...(p.isError
                ? { errorText: "tool-error" }
                : { output: outputValue }),
            } as unknown as (typeof parts)[number];
            merged = true;
            break;
          }
          if (merged) break;
        }

        // Fallback: if no matching tool call exists in UI history, render it as its own part.
        if (!merged) {
          if (p.isError) {
            uiParts.push({
              type: `tool-${p.toolName}` as `tool-${string}`,
              toolCallId: p.toolCallId,
              state: "output-error",
              // UI tool parts require an `input` field; when missing, fall back to empty object.
              input: {},
              errorText: "tool-error",
            });
          } else {
            uiParts.push({
              type: `tool-${p.toolName}` as `tool-${string}`,
              toolCallId: p.toolCallId,
              state: "output-available",
              input: {},
              output: outputValue,
            });
          }
        }
      }

      if (uiParts.length > 0) {
        uiMessages.push({
          id: m.id,
          role: "assistant",
          parts: uiParts,
          metadata: { createdAt: m.createdAt.toISOString() },
        });
      }

      continue;
    }

    for (const p of chatParts) {
      if (p.type === "text") {
        uiParts.push({ type: "text", text: p.text });
      } else if (p.type === "tool-call") {
        uiParts.push({
          type: `tool-${p.toolName}` as `tool-${string}`,
          toolCallId: p.toolCallId,
          state: "input-available",
          input: p.input,
        });
      } else if (p.type === "tool-result") {
        // For UI rendering, prefer raw output values (e.g. {selection:"A"}) over the wrapped ToolResultOutput.
        // DB persists ToolResultOutput for provider-agnostic storage; UI expects tool-specific output shape.
        const outputValue: unknown = (() => {
          const out = p.output;
          if (isToolResultOutput(out)) {
            if (out.type === "json" || out.type === "error-json") return out.value;
            if (out.type === "text" || out.type === "error-text") return out.value;
          }
          // Fallback: keep as-is
          return out;
        })();
        if (p.isError) {
          uiParts.push({
            type: `tool-${p.toolName}` as `tool-${string}`,
            toolCallId: p.toolCallId,
            state: "output-error",
            input: {},
            errorText: "tool-error",
          });
        } else {
          uiParts.push({
            type: `tool-${p.toolName}` as `tool-${string}`,
            toolCallId: p.toolCallId,
            state: "output-available",
            input: {},
            output: outputValue,
          });
        }
      } else if (p.type === "file") {
        const url = urlMap.get(p.ref) ?? "";
        uiParts.push({
          type: "file",
          mediaType: p.mediaType,
          filename: p.name,
          url,
          // IMPORTANT:
          // Keep the stable storage ref for client-side replay.
          // The UI can use this ref to refresh short-lived signed URLs.
          providerMetadata: { attachment: { ref: p.ref } },
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
