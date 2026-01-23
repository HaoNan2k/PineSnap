import { ChatPart } from "./types";
import { isToolResultOutput } from "./tool-result-output";
import { isRecord } from "@/lib/utils";
import type { UIMessage } from "ai";

export type A2UIToolInvocation = {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown> | string;
  isReadOnly: boolean;
};

/**
 * Returns the slice of UI parts that belong to the last "step".
 *
 * AI SDK emits `{ type: "step-start" }` parts to mark boundaries between steps
 * (e.g. tool loop steps). When a new assistant response message is created, the
 * SDK may start from a snapshot of the previous assistant message. In that case,
 * older tool UI parts can be inherited into the new message.
 *
 * By rendering only the last-step tool parts, we ensure:
 * - The previous message keeps its own tool UI and reflects updated state.
 * - A new message bubble stays "clean" and does not show tool UI inherited from
 *   the previous step unless the model calls tools again in the new step.
 */
export function slicePartsToLastStep(
  parts: UIMessage["parts"] | undefined
): UIMessage["parts"] | undefined {
  if (!parts || parts.length === 0) return parts;

  let lastStepStartIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!isRecord(p)) continue;
    if ((p as Record<string, unknown>)["type"] === "step-start") {
      lastStepStartIndex = i;
    }
  }

  if (lastStepStartIndex === -1) return parts;
  return parts.slice(lastStepStartIndex + 1);
}

export function getToolInvocationsFromParts(
  parts: UIMessage["parts"] | undefined
): A2UIToolInvocation[] {
  if (!parts || parts.length === 0) return [];

  return parts
    .filter((part) => {
      if (!isRecord(part)) return false;
      const rec = part as Record<string, unknown>;
      if (typeof rec["type"] !== "string") return false;
      if (!rec["type"].startsWith("tool-")) return false;
      return typeof rec["toolCallId"] === "string";
    })
    .map((part) => {
      const rec = part as Record<string, unknown>;
      const type = rec["type"] as string;
      const toolName = type.replace("tool-", "");
      const toolCallId = rec["toolCallId"] as string;

      const input = rec["input"];
      const args = isRecord(input) ? input : {};

      const output = rec["output"];
      const result =
        isRecord(output) || typeof output === "string" ? output : undefined;

      const state = rec["state"];
      const isReadOnly =
        typeof state === "string"
          ? state.startsWith("output-")
          : result !== undefined;

      return { toolName, toolCallId, args, result, isReadOnly };
    });
}

/**
 * Tool invocations derived from the last step only.
 *
 * Use this for A2UI rendering to avoid showing tool UI inherited from a previous
 * assistant message snapshot.
 */
export function getToolInvocationsFromLastStep(
  parts: UIMessage["parts"] | undefined
): A2UIToolInvocation[] {
  return getToolInvocationsFromParts(slicePartsToLastStep(parts));
}

function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function summarizePart(part: Record<string, unknown>): string {
  const type = typeof part["type"] === "string" ? part["type"] : "unknown";
  let summary = `type=${type}`;

  if (type === "text") {
    const text = typeof part["text"] === "string" ? part["text"] : "";
    summary += `|len=${text.length}|head=${text.slice(0, 80)}`;
    return summary;
  }

  if (type.startsWith("tool-") || type === "dynamic-tool") {
    const toolCallId =
      typeof part["toolCallId"] === "string" ? part["toolCallId"] : "";
    const toolName =
      typeof part["toolName"] === "string" ? part["toolName"] : "";
    const state = typeof part["state"] === "string" ? part["state"] : "";
    summary += `|toolCallId=${toolCallId}|toolName=${toolName}|state=${state}`;
    return summary;
  }

  if (type === "source-url" || type === "source-document") {
    const id = typeof part["id"] === "string" ? part["id"] : "";
    const url = typeof part["url"] === "string" ? part["url"] : "";
    const title = typeof part["title"] === "string" ? part["title"] : "";
    summary += `|id=${id}|url=${url}|title=${title}`;
    return summary;
  }

  if (type.startsWith("data-")) {
    const id = typeof part["id"] === "string" ? part["id"] : "";
    summary += `|id=${id}`;
    return summary;
  }

  return summary;
}

export function getLastStepFingerprint(
  parts: UIMessage["parts"] | undefined
): string {
  const lastStep = slicePartsToLastStep(parts);
  if (!lastStep || lastStep.length === 0) return "";

  const summary = lastStep
    .filter((part) => isRecord(part))
    .map((part) => summarizePart(part))
    .join("||");

  return summary.length > 0 ? hashString(summary) : "";
}

export function hasTurnOutput(
  parts: UIMessage["parts"] | undefined
): boolean {
  const lastStep = slicePartsToLastStep(parts);
  if (!lastStep || lastStep.length === 0) return false;

  for (const part of lastStep) {
    if (!isRecord(part)) continue;
    const type = part["type"];
    if (typeof type !== "string") continue;

    if (type === "text") {
      const text = part["text"];
      if (typeof text === "string" && text.trim().length > 0) {
        return true;
      }
      continue;
    }

    if (type.startsWith("tool-") || type === "dynamic-tool") return true;

    if (
      type === "source-url" ||
      type === "source-document" ||
      type.startsWith("data-")
    ) {
      return true;
    }
  }

  return false;
}

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
