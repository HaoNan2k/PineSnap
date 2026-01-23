import { z } from "zod";
import { generateText, Output, type ModelMessage } from "ai";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  createLearningForResources,
  getLearningWithAccessCheck,
  ensureLearningConversation,
  updateLearningClarify,
  updateLearningPlanWithClarify,
  type LearningAccessResult,
} from "@/lib/db/learning";
import { getConversation } from "@/lib/db/conversation";
import { convertLearnDbToUIMessages } from "@/lib/learn/a2ui/merge";
import { getResourcesContextText } from "@/lib/learn/resource-context";
import {
  getClarifySystemPrompt,
  getClarifyUserPrompt,
} from "@/lib/learn/prompts/clarify-prompts";
import {
  clarifyPayloadSchema,
  clarifyQuestionSchema,
  clarifyAnswerSchema,
  type ClarifyPayload,
  type ClarifyAnswer,
} from "@/lib/learn/clarify";
import { logError } from "@/lib/logger";

/**
 * Helper to get learning with access check, throws TRPCError on failure.
 * Avoids repeated code and non-null assertions.
 */
async function getLearningOrThrow(learningId: string, userId: string) {
  const result = await getLearningWithAccessCheck(learningId, userId);
  if (!result.ok) {
    throw new TRPCError({
      code: result.status === 403 ? "FORBIDDEN" : "NOT_FOUND",
    });
  }
  // TypeScript discriminated union: when ok=true, learning is guaranteed
  return result.learning as NonNullable<
    Extract<LearningAccessResult, { ok: true }>["learning"]
  >;
}

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

const clarifySchema = z.object({
  questions: z.array(clarifyQuestionSchema).length(3),
});

function resolveAnswerText(
  answer: ClarifyAnswer,
  optionMap: Map<string, string>
): string | null {
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

export const learningRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        resourceIds: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createLearningForResources({
        userId: ctx.user.id,
        resourceIds: input.resourceIds,
      });

      if (!result.ok) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return { id: result.learning.id };
    }),

  getState: protectedProcedure
    .input(z.object({ learningId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const learning = await getLearningOrThrow(input.learningId, ctx.user.id);
      const resources = learning.resources.map((item) => item.resource);
      const clarifyParsed = clarifyPayloadSchema.safeParse(learning.clarify);
      const clarify = clarifyParsed.success ? clarifyParsed.data : null;

      const conversation = await ensureLearningConversation(
        learning.id,
        ctx.user.id
      );
      const conversationWithMessages = await getConversation(
        conversation.id,
        ctx.user.id
      );
      const initialMessages = conversationWithMessages
        ? await convertLearnDbToUIMessages(conversationWithMessages.messages)
        : [];

      return {
        learning: {
          id: learning.id,
          plan: learning.plan,
          clarify,
        },
        resources,
        conversationId: conversation.id,
        initialMessages,
      };
    }),

  generateClarify: protectedProcedure
    .input(z.object({ learningId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const learning = await getLearningOrThrow(input.learningId, ctx.user.id);

      // Return existing clarify if available
      const existingClarify = clarifyPayloadSchema.safeParse(learning.clarify);
      if (existingClarify.success) {
        return { questions: existingClarify.data.questions };
      }

      // Generate new clarify questions
      const resources = learning.resources.map((item) => item.resource);
      const promptInput = getResourcesContextText(
        resources.map((resource) => ({
          title: resource.title,
          type: resource.type,
          content: resource.content,
        }))
      );

      const messages: ModelMessage[] = [
        { role: "system", content: getClarifySystemPrompt() },
        { role: "user", content: getClarifyUserPrompt(promptInput) },
      ];

      const result = await generateText({
        model: "openai/gpt-5.2",
        messages,
        output: Output.object({ schema: clarifyDraftSchema }),
        maxRetries: 2,
      });

      if (!result.output?.questions) {
        logError("Clarify JSON output missing", {
          finishReason: result.finishReason,
          warnings: result.warnings,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "生成澄清问题失败",
        });
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "生成澄清问题失败",
        });
      }

      const clarifyPayload: ClarifyPayload = {
        questions: validated.data.questions,
        askedAt: new Date().toISOString(),
      };

      await updateLearningClarify({
        learningId: input.learningId,
        clarify: clarifyPayload,
      });

      return { questions: validated.data.questions };
    }),

  generatePlan: protectedProcedure
    .input(
      z.object({
        learningId: z.string().uuid(),
        answers: z.array(clarifyAnswerSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const learning = await getLearningOrThrow(input.learningId, ctx.user.id);

      const clarifyParsed = clarifyPayloadSchema.safeParse(learning.clarify);
      if (!clarifyParsed.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请先完成澄清问题",
        });
      }

      const answers = input.answers;
      const questions = clarifyParsed.data.questions;

      const answerMap = new Map(
        answers.map((answer) => [answer.questionId, answer])
      );
      if (answerMap.size !== questions.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "答案数量不匹配",
        });
      }

      const qaItems: Array<{ prompt: string; answerText: string }> = [];
      for (const question of questions) {
        const answer = answerMap.get(question.id);
        if (!answer || answer.type !== question.type) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "答案格式不正确",
          });
        }

        const optionMap = new Map(
          question.options.map((option) => [option.id, option.text])
        );
        const answerText = resolveAnswerText(answer, optionMap);
        if (!answerText) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "答案选项无效",
          });
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
        model: "openai/gpt-5.2",
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
        learningId: input.learningId,
        plan: text,
        clarify: clarifyPayload,
      });

      return { plan: text };
    }),
});
