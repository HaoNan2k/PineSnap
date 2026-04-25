import "server-only";

import { generateObject } from "ai";

import {
  PROMPT_VERSION,
  buildSummarySystemPrompt,
  buildSummaryUserMessage,
} from "./prompt";
import { SummaryOutputSchema, type SummaryOutput } from "./schema";

const MODEL_ID = "anthropic/claude-sonnet-4-6";

export interface GenerateSummaryInput {
  title: string;
  sourceType: string;
  canonicalUrl: string;
  content: unknown;
}

export interface GenerateSummaryResult extends SummaryOutput {
  durationMs: number;
  modelId: string;
  promptVersion: string;
}

export async function generateSummary(
  input: GenerateSummaryInput
): Promise<GenerateSummaryResult> {
  const system = buildSummarySystemPrompt();
  const userMessage = buildSummaryUserMessage(input);

  const start = Date.now();
  const { object } = await generateObject({
    model: MODEL_ID,
    schema: SummaryOutputSchema,
    system,
    prompt: userMessage,
    maxRetries: 1,
  });
  const durationMs = Date.now() - start;

  return {
    ...object,
    durationMs,
    modelId: MODEL_ID,
    promptVersion: PROMPT_VERSION,
  };
}
