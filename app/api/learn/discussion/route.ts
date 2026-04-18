import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  UI_MESSAGE_STREAM_HEADERS,
  consumeStream,
  type ContentPart,
  type ModelMessage,
  type ToolSet,
} from "ai";
import { waitUntil } from "@vercel/functions";
import { getAuthenticatedUserIdFromRequest } from "@/lib/supabase/auth";
import { getLearningWithAccessCheck } from "@/lib/db/learning";
import { getResourcesContextText } from "@/lib/learn/resource-context";
import {
  dbToModelMessages,
  sdkToChatParts,
} from "@/lib/chat/converter";
import {
  createDiscussionMessage,
  getDiscussionMessages,
  AnchorValidationError,
} from "@/lib/db/discussion";
import {
  getCanvasConversation,
  getOrCreateChatConversation,
  touchConversation,
} from "@/lib/db/conversation";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/logger";
import { discussionRequestBodySchema } from "@/lib/chat/schemas";
import { buildDiscussionSystemPrompt } from "@/lib/learn/prompts/discussion-system-prompt";
import { memory } from "@/lib/chat/memory";

export const maxDuration = 60;

/**
 * Derive a short topic for each canvas step from its assistant message.
 *
 * A canvas step = one assistant message that contains tool calls. The "title"
 * is derived from the first interesting tool input we recognize. Falls back
 * to "step N" when no recognizable tool is found.
 */
function buildCanvasStepMap(
  canvasMessages: Array<{ id: string; role: Role; parts: unknown }>,
  currentAnchorMessageId: string
): {
  stepMap: Array<{ stepNumber: number; title: string }>;
  currentStepNumber: number;
} {
  const assistantMessages = canvasMessages.filter(
    (m) => m.role === Role.assistant
  );
  let currentStepNumber = 1;
  const stepMap = assistantMessages.map((m, idx) => {
    const stepNumber = idx + 1;
    if (m.id === currentAnchorMessageId) currentStepNumber = stepNumber;

    let title = `step ${stepNumber}`;
    if (Array.isArray(m.parts)) {
      for (const p of m.parts as Array<Record<string, unknown>>) {
        if (typeof p?.type !== "string") continue;
        if (!p.type.startsWith("tool-")) continue;
        const input = p.input as Record<string, unknown> | undefined;
        if (!input) continue;
        if (typeof input.question === "string" && input.question.length > 0) {
          title = input.question.slice(0, 80);
          break;
        }
        if (typeof input.markdown === "string" && input.markdown.length > 0) {
          title = input.markdown.slice(0, 80).replace(/\s+/g, " ").trim();
          break;
        }
      }
    }
    return { stepNumber, title };
  });
  return { stepMap, currentStepNumber };
}

export async function POST(req: Request) {
  try {
    const bodyJson: unknown = await req.json();
    const parsed = discussionRequestBodySchema.safeParse(bodyJson);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userId = await getAuthenticatedUserIdFromRequest(req);
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { learningId, anchorMessageId, clientMessageId, input } = parsed.data;

    // Access check via the existing learning helper. We do NOT need the heavy
    // resource content here, only title + plan.
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

    // Lazy-create the chat conversation (advisory-locked). Returns same id on
    // concurrent calls.
    const chatConversation = await getOrCreateChatConversation(
      learningId,
      userId
    );

    // Load canvas conversation (read-only context for the LLM).
    const canvasConversation = await getCanvasConversation(learningId, userId);
    if (!canvasConversation) {
      return Response.json(
        { error: "Canvas conversation missing for this learning" },
        { status: 404 }
      );
    }

    // Fetch canvas messages (for step map) and existing discussion history (full).
    const [canvasMessages, existingDiscussion] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: canvasConversation.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
      }),
      getDiscussionMessages(chatConversation.id),
    ]);

    const { stepMap: canvasStepMap, currentStepNumber } = buildCanvasStepMap(
      canvasMessages,
      anchorMessageId
    );

    const contextText = getResourcesContextText(
      resources.map((resource) => ({
        title: resource.title,
        sourceType: resource.sourceType,
        content:
          resource.captureJobs[0]?.artifacts[0]?.content ?? resource.metadata,
      }))
    );

    const userKnowledge = await memory.getUserKnowledge(userId);
    const systemPrompt = buildDiscussionSystemPrompt({
      userKnowledge,
      learningPlan: learning.plan ?? "（学习计划尚未生成）",
      resourcesContext: contextText,
      canvasStepMap,
      currentStepNumber,
    });

    // Pre-validate the anchor BEFORE any side effects (cheap fail).
    // We catch AnchorValidationError specifically and translate to 400.
    try {
      // We do this via a no-op assert by attempting createDiscussionMessage's
      // validator path. Since createDiscussionMessage internally validates,
      // we duplicate the check here just for early failure with a clean error.
      // (The validator is fast: 2 SELECT queries.)
      const { assertValidAnchor } = await import("@/lib/db/discussion");
      await assertValidAnchor(chatConversation.id, anchorMessageId);
    } catch (err) {
      if (err instanceof AnchorValidationError) {
        return Response.json(
          { error: "Invalid anchor", reason: err.reason },
          { status: 400 }
        );
      }
      throw err;
    }

    // Replay full discussion history + the new user input as the conversation
    // tail. We do NOT persist the user message yet — onFinish persists both
    // user + assistant atomically (or neither on abort).
    const historyModelMessages = await dbToModelMessages(existingDiscussion);
    const userInputModelMessages = await dbToModelMessages([
      {
        role: Role.user,
        parts: input as unknown as Parameters<typeof dbToModelMessages>[0][number]["parts"],
      },
    ]);
    const requestMessages: ModelMessage[] = [
      { role: "system", content: systemPrompt },
      ...historyModelMessages,
      ...userInputModelMessages,
    ];

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start" });

        const result = streamText({
          model: "openai/gpt-5.2",
          messages: requestMessages,
          // Discussion endpoint MUST NOT expose any tools (Light Anchor design).
          tools: {} as ToolSet,
          onError: (error) => {
            logError("streamText /api/learn/discussion failed", error);
          },
          onFinish: ({ response, ...rest }) => {
            const isAborted =
              "isAborted" in rest && (rest as { isAborted?: boolean }).isAborted === true;
            if (isAborted) {
              // Light Anchor + no-write-on-abort: do not persist anything when the
              // stream is aborted mid-flight. The user can re-submit.
              return;
            }
            waitUntil(
              (async () => {
                try {
                  await prisma.$transaction(async (tx) => {
                    // Persist the user input first
                    await tx.message.create({
                      data: {
                        conversationId: chatConversation.id,
                        role: Role.user,
                        parts: input as unknown as object,
                        clientMessageId,
                        anchoredCanvasMessageId: anchorMessageId,
                      },
                    });
                    // Then persist all assistant messages from this turn
                    for (const message of response.messages) {
                      const parts = sdkToChatParts(
                        message.content as Array<ContentPart<ToolSet>>
                      );
                      if (parts.length === 0) continue;
                      await tx.message.create({
                        data: {
                          conversationId: chatConversation.id,
                          role: Role.assistant,
                          parts: parts as unknown as object,
                          anchoredCanvasMessageId: anchorMessageId,
                        },
                      });
                    }
                  });
                  await touchConversation(chatConversation.id, userId);
                } catch (error) {
                  logError("Failed to persist discussion messages", error);
                }
              })()
            );
          },
        });

        writer.merge(result.toUIMessageStream({ sendStart: false }));
      },
      onError: (error) => {
        logError("UI message stream /api/learn/discussion failed", error);
        return "An error occurred.";
      },
    });

    return createUIMessageStreamResponse({
      stream,
      headers: UI_MESSAGE_STREAM_HEADERS,
      consumeSseStream: consumeStream,
    });
  } catch (err) {
    logError("POST /api/learn/discussion failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * Why we re-export createDiscussionMessage's validator inline above:
 * we want a clean 400 with `reason` BEFORE allocating the LLM. This costs
 * one extra round-trip but the validator query is light (2 SELECTs by id).
 *
 * The waitUntil callback also goes through createDiscussionMessage when
 * persisting? No — we use raw prisma.message.create inside a transaction
 * because we want user + assistant atomicity, and createDiscussionMessage
 * doesn't expose a tx parameter. The validator was already checked above,
 * so anchor integrity holds.
 */
void createDiscussionMessage;
