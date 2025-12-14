import {
  streamText,
  ModelMessage,
  UserContent,
  AssistantContent,
  UIMessage,
  UI_MESSAGE_STREAM_HEADERS,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { waitUntil } from '@vercel/functions';
import { ensureConversationById, getConversation, touchConversation, updateConversationTitle } from "@/lib/db/conversation";
import { createMessage } from "@/lib/db/message";
import { textToParts, parseMessageParts } from "@/lib/chat/utils";
import { Role } from "@/generated/prisma/client";
import { z } from 'zod';
export const maxDuration = 30;

type AppUIMessage = UIMessage<unknown, { conversation_id: { id: string } }>;

// Helper to map DB parts to SDK content
function dbPartsToUserContent(dbParts: unknown): UserContent {
    const parts = parseMessageParts(dbParts);
    if (parts.length === 0) return "";
    
    return parts.map(p => {
        // Assume text for now, as DB schema only guarantees text in this iteration
        if (p.type === 'text') return { type: 'text', text: p.text };
        return { type: 'text', text: '' }; 
    });
}

function dbPartsToAssistantContent(dbParts: unknown): AssistantContent {
    const parts = parseMessageParts(dbParts);
    if (parts.length === 0) return "";
    
    return parts.map(p => {
        if (p.type === 'text') return { type: 'text', text: p.text };
        return { type: 'text', text: '' };
    });
}

export async function POST(req: Request) {
  try {
    const bodyJson: unknown = await req.json();

    const bodySchema = z.object({
      conversationId: z.string().uuid("Invalid conversation ID format"), // Must be UUID provided by client
      clientMessageId: z.string().uuid(),
      input: z.array(z.object({ type: z.literal('text'), text: z.string() })).min(1),
    });

    const parsedBody = bodySchema.safeParse(bodyJson);
    if (!parsedBody.success) {
      return Response.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const { conversationId, clientMessageId, input } = parsedBody.data;
    const userId = "default-user"; // TODO: Replace with real auth

    // 1. Optimistic Creation / Retrieval
    // We trust the client provided ID (after validation)
    await ensureConversationById(conversationId, userId, clientMessageId);
    
    // 2. Persist User Message
    await createMessage(conversationId, Role.user, input, clientMessageId);

    // 3. Fetch Full History
    const conversation = await getConversation(conversationId, userId);
    const historyMessages = conversation?.messages || [];

    // Generate title if this is the first message (or only one user message)
    // Simple heuristic: if total messages <= 1 (just the one we added)
    if (historyMessages.length <= 1) {
        const text = input
            .filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join('\n');
        const title = text.slice(0, 30);
        await updateConversationTitle(conversationId, userId, title);
    }

    // 4. Convert to ModelMessage
    const coreMessages: ModelMessage[] = historyMessages.map(m => {
        const role = m.role;
        
        if (role === Role.user) {
            return { role: 'user', content: dbPartsToUserContent(m.parts) };
        } else if (role === Role.assistant) {
            return { role: 'assistant', content: dbPartsToAssistantContent(m.parts) };
        } else if (role === Role.system) {
            const parts = parseMessageParts(m.parts);
            const text = parts.map(p => p.text).join('\n');
            return { role: 'system', content: text };
        }
        
        return { role: 'user', content: dbPartsToUserContent(m.parts) }; 
    });

    // 5. Stream
    const result = streamText({
      model: ('google/gemini-2.0-flash'),
      messages: coreMessages,
      onFinish: async ({ text }) => {
        waitUntil((async () => {
            try {
                const parts = textToParts(text);
                await createMessage(conversationId, Role.assistant, parts);
                await touchConversation(conversationId, userId);
            } catch (error) {
                console.error("Failed to persist assistant message:", error);
            }
        })());
      },
    });

    const stream = createUIMessageStream<AppUIMessage>({
      execute: ({ writer }) => {
        writer.write({ type: 'start' });
        // We still send the ID for confirmation, though client already has it
        writer.write({
          type: 'data-conversation_id',
          data: { id: conversationId },
          transient: true,
        });
        writer.merge(result.toUIMessageStream<AppUIMessage>({ sendStart: false }));
      },
      onError: () => 'An error occurred.',
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        ...UI_MESSAGE_STREAM_HEADERS,
        'x-conversation-id': conversationId,
      },
    });

  } catch (err) {
    console.error("POST /api/chat failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
