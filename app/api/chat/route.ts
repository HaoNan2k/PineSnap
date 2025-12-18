import {
  streamText,
  UIMessage,
  UI_MESSAGE_STREAM_HEADERS,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { waitUntil } from "@vercel/functions";
import {
  ensureConversationById,
  ensureConversationForFirstMessage,
  getConversation,
  touchConversation,
  updateConversationTitle,
} from "@/lib/db/conversation";
import { createMessage } from "@/lib/db/message";
import { Role } from "@/generated/prisma/client";
import { z } from "zod";
import { dbToModelMessages, sdkToChatParts } from "@/lib/chat/converter";
import { ChatPart } from "@/lib/chat/types";
import { isToolResultOutput } from "@/lib/chat/toolResultOutput";
import type { ToolResultPart } from "ai";

export const maxDuration = 30;

type AppUIMessage = UIMessage<unknown, {
  conversationId: { id: string };
  titleUpdated: { id: string; title: string };
}>;

export async function POST(req: Request) {
  try {
    const bodyJson: unknown = await req.json();

    const toolResultOutputSchema = z.custom<ToolResultPart["output"]>((v) =>
      isToolResultOutput(v)
    );

    // IMPORTANT: ChatPart is our stable request/persist/replay schema.
    // Greenfield contract: no legacy field names are accepted.
    const chatPartSchema: z.ZodType<ChatPart> = z.union([
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

    const bodySchema = z.object({
      // Optional for first message; when omitted, the server lazily creates a conversation and returns its id in-stream.
      conversationId: z.uuid().optional(),
      clientMessageId: z.string().min(1),
      input: z.array(chatPartSchema).min(1),
    });

    const parsedBody = bodySchema.safeParse(bodyJson);
    if (!parsedBody.success) {
      return Response.json(
        { error: "Invalid request body", details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const { conversationId, clientMessageId, input } = parsedBody.data;
    const userId = "default-user"; // TODO: Replace with real auth

    // 1. Create / Retrieve conversation (lazy-create for first message)
    const ensuredConversation = conversationId
      ? await ensureConversationById(conversationId, userId, clientMessageId)
      : await ensureConversationForFirstMessage(userId, clientMessageId);

    if (!ensuredConversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    const ensuredConversationId = ensuredConversation.id;

    // 2. Persist User Message
    await createMessage(
      ensuredConversationId,
      Role.user,
      input,
      clientMessageId
    );
    await touchConversation(ensuredConversationId, userId);

    // 3. Fetch Full History
    const conversation = await getConversation(ensuredConversationId, userId);
    const historyMessages = conversation?.messages || [];

    // Generate title if this is the first message (or only one user message)
    let newTitle: string | null = null;
    if (historyMessages.length <= 1) {
      const isTextInputPart = (
        p: (typeof input)[number]
      ): p is Extract<(typeof input)[number], { type: "text" }> =>
        p.type === "text";

      const text = input
        .filter(isTextInputPart)
        .map((p) => p.text)
        .join("\n");

      // Only update title if we have some text content
      if (text.length > 0) {
        const title = text.slice(0, 30);
        await updateConversationTitle(ensuredConversationId, userId, title);
        newTitle = title;
      }
    }

    // 4. Convert to ModelMessage using unified converter
    // This handles File Ref resolution and Tool structures
    const modelMessages = await dbToModelMessages(historyMessages);

    // 5. Stream
    const result = streamText({
      model: "google/gemini-2.0-flash",
      messages: modelMessages,
      onFinish: async ({ content }) => {
        waitUntil(
          (async () => {
            try {
              // Use converter to map SDK output (content parts) back to ChatPart[]
              const parts = sdkToChatParts(content);
              await createMessage(ensuredConversationId, Role.assistant, parts);
              await touchConversation(ensuredConversationId, userId);
            } catch (error) {
              console.error("Failed to persist assistant message:", error);
            }
          })()
        );
      },
    });

    const stream = createUIMessageStream<AppUIMessage>({
      execute: ({ writer }) => {
        writer.write({ type: "start" });
        // Always send the confirmed conversation id (especially important for lazy-create first message).
        writer.write({
          type: "data-conversationId",
          data: { id: ensuredConversationId },
          transient: true,
        });
        // Send title update notification to trigger sidebar refresh
        if (newTitle) {
          writer.write({
            type: "data-titleUpdated",
            data: { id: ensuredConversationId, title: newTitle },
            transient: true,
          });
        }
        writer.merge(
          result.toUIMessageStream<AppUIMessage>({ sendStart: false })
        );
      },
      onError: () => "An error occurred.",
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        ...UI_MESSAGE_STREAM_HEADERS,
        "x-conversation-id": ensuredConversationId,
      },
    });
  } catch (err) {
    console.error("POST /api/chat failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
