import type { UIMessage } from "ai";
import { convertDbToUIMessages } from "@/lib/chat/converter";
import { parseMessageParts } from "@/lib/chat/utils";
import { isToolResultOutput } from "@/lib/chat/tool-result-output";
import { isRecord } from "@/lib/utils";
import {
  LEARN_DEFAULT_TOOL_POLICIES,
  resolveLearnToolPolicy,
  type LearnToolRenderPolicy,
} from "./policy";

type DbMessage = {
  id: string;
  role: string;
  parts: unknown;
  createdAt: Date;
};

/**
 * Convert Learn conversation DB messages into UI messages.
 *
 * Key behavior:
 * - Role.tool messages are NEVER rendered as separate bubbles.
 * - We "join" tool-result (Role.tool) back into the originating assistant tool UI part
 *   by matching `toolCallId`, so history replay does not duplicate tool UI.
 *
 * This is a **UI-only** transformation and must not affect DB→Model conversion.
 */
export async function convertLearnDbToUIMessages(
  dbMessages: DbMessage[],
  options?: {
    policies?: LearnToolRenderPolicy[];
  }
): Promise<UIMessage[]> {
  const policies = options?.policies ?? LEARN_DEFAULT_TOOL_POLICIES;

  // Split facts:
  // - Non-tool messages: rendered to UI bubbles.
  // - Tool messages: join-only (no bubble).
  const nonToolMessages = dbMessages.filter((m) => m.role !== "tool");
  const toolMessages = dbMessages.filter((m) => m.role === "tool");

  const uiMessages = await convertDbToUIMessages(nonToolMessages);

  if (toolMessages.length === 0) return uiMessages;

  // Build a toolCallId -> tool-result map (latest wins).
  const toolResultByCallId = new Map<
    string,
    { toolName: string; outputValue: unknown; isError: boolean }
  >();

  const sortedToolMessages = [...toolMessages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  for (const m of sortedToolMessages) {
    const parts = parseMessageParts(m.parts);
    for (const p of parts) {
      if (p.type !== "tool-result") continue;

      const outputValue: unknown = (() => {
        const out = p.output;
        if (!isToolResultOutput(out)) return out;
        if (out.type === "json" || out.type === "error-json") return out.value;
        if (out.type === "text" || out.type === "error-text") return out.value;
        return out;
      })();

      toolResultByCallId.set(p.toolCallId, {
        toolName: p.toolName,
        outputValue,
        isError: p.isError === true,
      });
    }
  }

  if (toolResultByCallId.size === 0) return uiMessages;

  // Patch assistant tool parts in-place.
  for (const message of uiMessages) {
    if (message.role !== "assistant") continue;
    if (!message.parts || message.parts.length === 0) continue;

    for (let i = 0; i < message.parts.length; i++) {
      const part = message.parts[i];
      if (!isRecord(part)) continue;
      const rec = part as Record<string, unknown>;

      const type = rec["type"];
      const toolCallId = rec["toolCallId"];
      if (typeof type !== "string" || !type.startsWith("tool-")) continue;
      if (typeof toolCallId !== "string") continue;

      const toolName = type.replace("tool-", "");
      const result = toolResultByCallId.get(toolCallId);
      if (!result) continue;

      const policy = resolveLearnToolPolicy(result.toolName || toolName, policies);

      // Always mark as read-only by switching to output-* state.
      // This prevents history replay from showing "Submit All" again.
      if (result.isError) {
        message.parts[i] = {
          ...rec,
          state: "output-error",
          // Keep input as-is; do not fabricate.
          ...(typeof rec["input"] === "undefined" ? { input: {} } : {}),
          errorText: "tool-error",
        } as unknown as (typeof message.parts)[number];
        continue;
      }

      // For "none", we still attach output onto the existing tool part so the
      // component can display the user's selection in read-only mode.
      // We do NOT create an extra bubble/message.
      if (policy.renderToolResult === "none") {
        message.parts[i] = {
          ...rec,
          state: "output-available",
          ...(typeof rec["input"] === "undefined" ? { input: {} } : {}),
          output: isRecord(result.outputValue) || typeof result.outputValue === "string"
            ? result.outputValue
            : { value: result.outputValue },
        } as unknown as (typeof message.parts)[number];
        continue;
      }

      // Future: inline_card / sources_only
      // For now we still mark output-available and attach output (so UI can use it),
      // but rendering of extra cards/sources should be implemented in a dedicated UI layer.
      message.parts[i] = {
        ...rec,
        state: "output-available",
        ...(typeof rec["input"] === "undefined" ? { input: {} } : {}),
        output: isRecord(result.outputValue) || typeof result.outputValue === "string"
          ? result.outputValue
          : { value: result.outputValue },
      } as unknown as (typeof message.parts)[number];
    }
  }

  return uiMessages;
}

