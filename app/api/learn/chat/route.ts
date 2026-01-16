import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  UI_MESSAGE_STREAM_HEADERS,
  type ContentPart,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { waitUntil } from "@vercel/functions";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { getLearningWithAccessCheck } from "@/lib/db/learning";
import { getResourcesContextText } from "@/lib/learn/resource-context";
import { dbToModelMessages, sdkToChatParts } from "@/lib/chat/converter";
import { createMessage } from "@/lib/db/message";
import {
  isToolResultOutput,
  type ToolResultOutput,
} from "@/lib/chat/tool-result-output";
import { Role } from "@/generated/prisma/client";
import { getConversation, touchConversation } from "@/lib/db/conversation";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const bodyJson: unknown = await req.json();

    const toolResultOutputSchema = z.custom<ToolResultOutput>(isToolResultOutput);
    const chatPartSchema = z.union([
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
      learningId: z.string().uuid(),
      conversationId: z.string().uuid(),
      clientMessageId: z.string().min(1),
      input: z.array(chatPartSchema).min(1),
    });

    const parsed = bodySchema.safeParse(bodyJson);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { learningId, conversationId, clientMessageId, input } = parsed.data;

    const learningResult = await getLearningWithAccessCheck(learningId, userId);
    if (!learningResult.ok) {
      return Response.json(
        {
          error:
            learningResult.status === 403 ? "Forbidden" : "Learning not found",
        },
        { status: learningResult.status }
      );
    }

    const learning = learningResult.learning;
    if (!learning) {
      return Response.json({ error: "Learning not found" }, { status: 404 });
    }
    const resources = learning.resources.map((item) => item.resource);

    const relation = await prisma.learningConversation.findFirst({
      where: {
        learningId,
        conversationId,
        conversation: { userId, deletedAt: null },
      },
      select: { conversationId: true },
    });
    if (!relation) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!learning.plan) {
      return Response.json({ error: "Learning plan required" }, { status: 400 });
    }

    await createMessage(conversationId, Role.user, input, clientMessageId);
    await touchConversation(conversationId, userId);

    const conversation = await getConversation(conversationId, userId);
    if (!conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    const contextText = getResourcesContextText(
      resources.map((resource) => ({
        title: resource.title,
        type: resource.type,
        content: resource.content,
      }))
    );

    const systemPrompt = [
      "你是学习教练与答疑助手，帮助用户围绕学习计划推进学习。",
      "",
      "素材上下文：",
      contextText,
      "",
      "学习计划（Markdown）：",
      learning.plan,
    ].join("\n");

    const modelMessages = await dbToModelMessages(conversation.messages);

    const result = streamText({
      model: "google/gemini-2.0-flash",
      messages: [{ role: "system", content: systemPrompt }, ...modelMessages],
      onFinish: ({ response }) => {
        waitUntil(
          (async () => {
            try {
              for (const message of response.messages) {
                const parts = sdkToChatParts(
                  message.content as Array<ContentPart<ToolSet>>
                );
                if (parts.length === 0) continue;
                const role =
                  message.role === "tool" ? Role.tool : Role.assistant;
                await createMessage(conversationId, role, parts);
              }
              await touchConversation(conversationId, userId);
            } catch (error) {
              logError("Failed to persist learn messages", error);
            }
          })()
        );
      },
    });

    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "start" });
        writer.merge(result.toUIMessageStream({ sendStart: false }));
      },
      onError: () => "An error occurred.",
    });

    return createUIMessageStreamResponse({
      stream,
      headers: UI_MESSAGE_STREAM_HEADERS,
    });
  } catch (err) {
    logError("POST /api/learn/chat failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
