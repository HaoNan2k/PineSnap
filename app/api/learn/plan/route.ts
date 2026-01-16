import { z } from "zod";
import { generateText } from "ai";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import {
  getLearningWithAccessCheck,
  updateLearningPlanWithClarify,
} from "@/lib/db/learning";
import { getResourcesContextText } from "@/lib/learn/resource-context";
import {
  clarifyAnswerSchema,
  clarifyPayloadSchema,
  type ClarifyAnswer,
  type ClarifyPayload,
} from "@/lib/learn/clarify";

const bodySchema = z.object({
  learningId: z.string().uuid(),
  answers: z.array(clarifyAnswerSchema).min(1),
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
  const clarifyParsed = clarifyPayloadSchema.safeParse(learning.clarify);
  if (!clarifyParsed.success) {
    return Response.json(
      { error: "Clarify questions not found", code: "CLARIFY_NOT_FOUND" },
      { status: 400 }
    );
  }

  const answers = parsed.data.answers;
  const questions = clarifyParsed.data.questions;

  const answerMap = new Map(
    answers.map((answer) => [answer.questionId, answer])
  );
  if (answerMap.size !== questions.length) {
    return Response.json(
      { error: "Clarify answers mismatch", code: "CLARIFY_MISMATCH" },
      { status: 400 }
    );
  }

  const qaItems: Array<{ prompt: string; answerText: string }> = [];
  for (const question of questions) {
    const answer = answerMap.get(question.id);
    if (!answer || answer.type !== question.type) {
      return Response.json(
        { error: "Clarify answers mismatch", code: "CLARIFY_MISMATCH" },
        { status: 400 }
      );
    }

    const optionMap = new Map(
      question.options.map((option) => [option.id, option.text])
    );
    const answerText = resolveAnswerText(answer, optionMap);
    if (!answerText) {
      return Response.json(
        { error: "Clarify answers mismatch", code: "CLARIFY_MISMATCH" },
        { status: 400 }
      );
    }
    qaItems.push({ prompt: question.prompt, answerText });
  }

  const resources = learning.resources.map((item) => item.resource);
  const contextText = getResourcesContextText(
    resources.map((resource) => ({
      title: resource.title,
      type: resource.type,
      content: resource.content,
    }))
  );

  const qaBlock = qaItems
    .map((item, index) => `${index + 1}. ${item.prompt}\n答：${item.answerText}`)
    .join("\n\n");

  const { text } = await generateText({
    model: "google/gemini-2.0-flash",
    system:
      "你是学习计划制定助手。请输出 Markdown 文本形式的学习计划，简洁可执行。",
    prompt: `学习素材上下文：\n${contextText}\n\n澄清问答：\n${qaBlock}\n\n请生成学习计划（Markdown）。`,
  });

  const clarifyPayload: ClarifyPayload = {
    ...clarifyParsed.data,
    answers,
    answeredAt: new Date().toISOString(),
  };

  await updateLearningPlanWithClarify({
    learningId: parsed.data.learningId,
    plan: text,
    clarify: clarifyPayload,
  });

  return Response.json({ ok: true, plan: text });
}

function resolveAnswerText(
  answer: ClarifyAnswer,
  optionMap: Map<string, string>
) {
  if (answer.type === "single_choice") {
    const text = optionMap.get(answer.optionId);
    return text ? text.trim() : null;
  }

  const labels = answer.optionIds
    .map((id) => optionMap.get(id))
    .filter((item): item is string => typeof item === "string");
  if (labels.length !== answer.optionIds.length) {
    return null;
  }
  return labels.join("、");
}
