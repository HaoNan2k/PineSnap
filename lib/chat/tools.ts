import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** UI-only tools — no `execute`, client provides result via `addToolResult`. */
export const a2uiTools = {
  renderQuizSingle: tool({
    description: "Render a single-choice quiz to test the user's knowledge.",
    inputSchema: z.object({
      question: z.string().describe("The question to ask."),
      options: z
        .array(z.string())
        .describe("A list of options for the user to choose from."),
      correctAnswer: z
        .string()
        .describe("The correct option. Must be one of the options."),
    }),
  }),
  renderQuizMultiple: tool({
    description: "Render a multiple-choice quiz to test the user's knowledge.",
    inputSchema: z.object({
      question: z.string().describe("The question to ask."),
      options: z
        .array(z.string())
        .describe("A list of options for the user to choose from."),
      correctAnswers: z
        .array(z.string())
        .describe("The correct options. Each must be one of the options."),
    }),
  }),
  renderFillInBlank: tool({
    description: "Render a fill-in-the-blank exercise.",
    inputSchema: z.object({
      question: z
        .string()
        .describe("The sentence or code snippet with a blank."),
      placeholder: z.string().describe("The placeholder text for the blank."),
      correctAnswer: z
        .string()
        .describe("The expected answer for the blank."),
    }),
  }),
  renderSocraticBranch: tool({
    description:
      "Render a yes/no branching question to check the user's understanding before proceeding.",
    inputSchema: z.object({
      question: z
        .string()
        .describe("A yes/no question to check understanding."),
    }),
  }),
};

/** Server-side tools — have `execute`, need learningId context. */
export function createServerTools(learningId: string) {
  return {
    savePlan: tool({
      description:
        "Save or update the learning plan for this session. Call this after the clarify phase to persist the generated plan.",
      inputSchema: z.object({
        plan: z.string().describe("The full learning plan text in markdown."),
      }),
      execute: async ({ plan }) => {
        await prisma.learning.update({
          where: { id: learningId },
          data: { plan },
        });
        return { success: true };
      },
    }),
    markConceptCovered: tool({
      description:
        "Mark a concept as covered in this learning session. Call this when the user has demonstrated understanding of a concept.",
      inputSchema: z.object({
        concept: z
          .string()
          .describe("The concept name or short description that was covered."),
      }),
      execute: async ({ concept }) => {
        await prisma.conceptCoverage.upsert({
          where: {
            learningId_concept: { learningId, concept },
          },
          create: { learningId, concept },
          update: {},
        });
        return { success: true, concept };
      },
    }),
  };
}
