import { ChatPart } from "./types";
import { isToolResultOutput } from "./toolResultOutput";
import { isRecord } from "@/lib/utils";

function asNonEmptyString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asOptionalNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function normalizeChatPart(p: unknown): ChatPart | null {
  if (!isRecord(p)) return null;

  const type = p["type"];

  if (type === "text") {
    const text = typeof p["text"] === "string" ? p["text"] : null;
    return text === null ? null : { type: "text", text };
  }

  if (type === "file") {
    const name = asNonEmptyString(p["name"]);
    const ref = asNonEmptyString(p["ref"]);
    const mediaType = asNonEmptyString(p["mediaType"]);
    if (!name || !ref || !mediaType) return null;

    const size = asOptionalNumber(p["size"]);
    return { type: "file", name, ref, mediaType, ...(size ? { size } : {}) };
  }

  if (type === "tool-call") {
    const toolCallId = asNonEmptyString(p["toolCallId"]);
    const toolName = asNonEmptyString(p["toolName"]);
    if (!toolCallId || !toolName) return null;

    if (!("input" in p)) return null;
    const input = p["input"];
    return { type: "tool-call", toolCallId, toolName, input };
  }

  if (type === "tool-result") {
    const toolCallId = asNonEmptyString(p["toolCallId"]);
    const toolName = asNonEmptyString(p["toolName"]);
    if (!toolCallId || !toolName) return null;

    if (!("output" in p)) return null;
    const output = p["output"];
    const isError = typeof p["isError"] === "boolean" ? p["isError"] : undefined;
    if (!isToolResultOutput(output)) return null;
    return { type: "tool-result", toolCallId, toolName, output, ...(isError !== undefined ? { isError } : {}) };
  }

  if (type === "source") {
    const sourceType = asNonEmptyString(p["sourceType"]);
    const id = asNonEmptyString(p["id"]);
    if (!sourceType || !id) return null;
    const url = typeof p["url"] === "string" ? p["url"] : undefined;
    const title = typeof p["title"] === "string" ? p["title"] : undefined;
    const mediaType = typeof p["mediaType"] === "string" ? p["mediaType"] : undefined;
    const filename = typeof p["filename"] === "string" ? p["filename"] : undefined;
    return {
      type: "source",
      sourceType,
      id,
      ...(url ? { url } : {}),
      ...(title ? { title } : {}),
      ...(mediaType ? { mediaType } : {}),
      ...(filename ? { filename } : {}),
    };
  }

  return null;
}

// Helper to parse DB jsonb to ChatPart[]
export function parseMessageParts(parts: unknown): ChatPart[] {
  if (Array.isArray(parts)) {
    const normalized: ChatPart[] = [];
    for (const p of parts) {
      const n = normalizeChatPart(p);
      if (n) normalized.push(n);
    }
    return normalized;
  }
  return [];
}
