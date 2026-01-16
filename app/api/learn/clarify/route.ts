import { z } from "zod";
import { generateText, Output, type ModelMessage } from "ai";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { getLearningWithAccessCheck, updateLearningClarify } from "@/lib/db/learning";
import { getResourcesContextText } from "@/lib/learn/resource-context";
import {
  getClarifySystemPrompt,
  getClarifyUserPrompt,
} from "@/lib/learn/prompts/clarify-prompts";
import {
  clarifyPayloadSchema,
  clarifyQuestionSchema,
  type ClarifyPayload,
} from "@/lib/learn/clarify";
import { logError } from "@/lib/logger";

const bodySchema = z.object({
  learningId: z.string().uuid(),
});

const clarifySchema = z.object({
  questions: z.array(clarifyQuestionSchema).length(3),
});

const clarifyDraftSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z.union([z.literal("single_choice"), z.literal("multi_choice")]),
        prompt: z.string().min(1),
        options: z.array(z.string().min(1)).min(2),
      })
    )
    .length(3),
});

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return Response.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const bodyJson: unknown = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid request body",
        code: "INVALID_BODY",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const learningResult = await getLearningWithAccessCheck(
    parsed.data.learningId,
    userId
  );
  if (!learningResult.ok) {
    return Response.json(
      {
        error:
          learningResult.status === 403 ? "Forbidden" : "Learning not found",
        code:
          learningResult.status === 403 ? "FORBIDDEN" : "LEARNING_NOT_FOUND",
      },
      { status: learningResult.status }
    );
  }

  const learning = learningResult.learning;
  if (!learning) {
    return Response.json(
      { error: "Learning not found", code: "LEARNING_NOT_FOUND" },
      { status: 404 }
    );
  }
  const existingClarify = clarifyPayloadSchema.safeParse(learning.clarify);
  if (existingClarify.success) {
    return Response.json({
      ok: true,
      questions: existingClarify.data.questions,
    });
  }

  const resources = learning.resources.map((item) => item.resource);
  const promptInput = getResourcesContextText(
    resources.map((resource) => ({
      title: resource.title,
      type: resource.type,
      content: resource.content,
    }))
  );

  const messages: ModelMessage[] = [
    {
      role: "system",
      content: getClarifySystemPrompt(),
    },
    {
      role: "user",
      content: getClarifyUserPrompt(promptInput),
    },
  ];

  const result = await generateText({
    model: "google/gemini-3-flash",
    messages,
    output: Output.object({
      schema: clarifyDraftSchema,
    }),
    maxRetries: 2,
  });

  if (!result.output?.questions) {
    logError("Clarify JSON output missing", {
      finishReason: result.finishReason,
      warnings: result.warnings,
    });
    return Response.json(
      { error: "Failed to generate clarify questions", code: "CLARIFY_FAILED" },
      { status: 500 }
    );
  }

  const questions = result.output.questions.map((question, questionIndex) => ({
    id: `q${questionIndex + 1}`,
    type: question.type,
    prompt: question.prompt,
    options: question.options.map((text, optionIndex) => ({
      id: `o${optionIndex + 1}`,
      text,
    })),
  }));

  const validated = clarifySchema.safeParse({ questions });
  if (!validated.success) {
    logError("Clarify JSON output invalid", validated.error.flatten());
    return Response.json(
      { error: "Failed to generate clarify questions", code: "CLARIFY_INVALID" },
      { status: 500 }
    );
  }

  const clarifyPayload: ClarifyPayload = {
    questions: validated.data.questions,
    askedAt: new Date().toISOString(),
  };
  await updateLearningClarify({
    learningId: parsed.data.learningId,
    clarify: clarifyPayload,
  });

  return Response.json({ ok: true, questions: validated.data.questions });
}
