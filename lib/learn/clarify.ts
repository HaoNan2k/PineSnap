import { z } from "zod";

const clarifyOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const clarifyQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("single_choice"),
    prompt: z.string().min(1),
    options: z.array(clarifyOptionSchema).min(2),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("multi_choice"),
    prompt: z.string().min(1),
    options: z.array(clarifyOptionSchema).min(2),
  }),
]);

export const clarifyAnswerSchema = z.discriminatedUnion("type", [
  z.object({
    questionId: z.string().min(1),
    type: z.literal("single_choice"),
    optionId: z.string().min(1),
  }),
  z.object({
    questionId: z.string().min(1),
    type: z.literal("multi_choice"),
    optionIds: z.array(z.string().min(1)).min(1),
  }),
]);

export const clarifyPayloadSchema = z.object({
  questions: z.array(clarifyQuestionSchema).min(1),
  answers: z.array(clarifyAnswerSchema).optional(),
  askedAt: z.string().datetime(),
  answeredAt: z.string().datetime().optional(),
});

export type ClarifyQuestion = z.infer<typeof clarifyQuestionSchema>;
export type ClarifyAnswer = z.infer<typeof clarifyAnswerSchema>;
export type ClarifyPayload = z.infer<typeof clarifyPayloadSchema>;
