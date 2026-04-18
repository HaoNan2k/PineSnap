import { z } from "zod";
import { isToolResultOutput, type ToolResultOutput } from "./tool-result-output";

const toolResultOutputSchema = z.custom<ToolResultOutput>(isToolResultOutput);

/** Reusable zod schema for individual ChatPart variants in request bodies. */
export const chatPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("file"),
    name: z.string().min(1),
    mediaType: z.string().min(1),
    size: z.number().int().nonnegative().optional(),
    ref: z.string().min(1),
  }),
  z.object({
    type: z.literal("tool-call"),
    toolCallId: z.string(),
    toolName: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("tool-result"),
    toolCallId: z.string(),
    toolName: z.string(),
    output: toolResultOutputSchema,
    isError: z.boolean().optional(),
  }),
]);

/**
 * Shared schema for POST /api/learn/discussion requests.
 *
 * Both client (form submission) and server (route handler) MUST validate
 * against this schema to keep the contract in one place. See
 * docs/decisions/0003 for the Light Anchor design.
 */
export const discussionRequestBodySchema = z.object({
  learningId: z.string().uuid(),
  /**
   * The canvas assistant message id the user was viewing when they
   * submitted this discussion message. Frozen at submit time on the
   * client; server MUST trust this value (does not re-derive from the
   * current canvas state) to avoid race conditions where the canvas
   * has advanced while the request was in flight.
   */
  anchorMessageId: z.string().uuid(),
  /** Optional client-side conversation id for AI SDK's lazy creation flow. */
  chatConversationId: z.string().uuid().optional(),
  /** Idempotency key from the client. */
  clientMessageId: z.string().min(1),
  /**
   * The user's input parts (typically a single text part for free-form
   * discussion). File or tool parts are accepted by schema but discussion
   * AI does not yet act on them.
   */
  input: z.array(chatPartSchema).min(1),
});

export type DiscussionRequestBody = z.infer<typeof discussionRequestBodySchema>;
