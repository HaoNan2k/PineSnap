import { tool } from "ai";
import { z } from "zod";

export const a2uiTools = {
  renderQuizSingle: tool({
    description: "Render a single-choice quiz to test the user's knowledge.",
    inputSchema: z.object({
      question: z.string().describe("The question to ask."),
      options: z
        .array(z.string())
        .describe("A list of options for the user to choose from."),
    }),
    // Intentionally omit `execute`:
    // This is a UI-only tool. We want the model to emit a tool call, but NOT execute it on the server.
    // The client will provide the tool result via `addToolResult`.
  }),
  renderQuizMultiple: tool({
    description: "Render a multiple-choice quiz to test the user's knowledge.",
    inputSchema: z.object({
      question: z.string().describe("The question to ask."),
      options: z
        .array(z.string())
        .describe("A list of options for the user to choose from."),
    }),
    // Intentionally omit `execute` (UI-only; client provides result).
  }),
  renderFillInBlank: tool({
    description: "Render a fill-in-the-blank exercise.",
    inputSchema: z.object({
      question: z
        .string()
        .describe("The sentence or code snippet with a blank."),
      placeholder: z.string().describe("The placeholder text for the blank."),
    }),
    // Intentionally omit `execute` (UI-only; client provides result).
  }),
};
