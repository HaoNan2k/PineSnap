import "server-only";

import { generateText } from "ai";
import {
  PROMPT_VERSION,
  buildSummarySystemPrompt,
  buildSummaryUserMessage,
} from "./prompt";

const MODEL_ID = "anthropic/claude-sonnet-4-6";

export interface GenerateSummaryInput {
  title: string;
  sourceType: string;
  canonicalUrl: string;
  content: unknown;
}

export interface GenerateSummaryResult {
  html: string;
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
  const { text } = await generateText({
    model: MODEL_ID,
    system,
    prompt: userMessage,
    maxRetries: 1,
  });
  const durationMs = Date.now() - start;

  return {
    html: text,
    durationMs,
    modelId: MODEL_ID,
    promptVersion: PROMPT_VERSION,
  };
}
