import { memory } from "@/lib/chat/memory";
import {
  buildLearnSystemPrompt,
  buildClarifySystemPrompt,
} from "@/lib/learn/prompts/context-system-prompt";

interface ContextOptions {
  learningPlan?: string;
  resourcesContext?: string;
}

export async function getContextSystemPrompt(
  userId: string,
  options: ContextOptions = {}
): Promise<string> {
  const userKnowledge = await memory.getUserKnowledge(userId);

  const learningPlan =
    options.learningPlan ?? "No specific learning plan active.";
  const resourcesContext = options.resourcesContext;

  return buildLearnSystemPrompt({
    userKnowledge,
    learningPlan,
    resourcesContext,
  });
}

export async function getClarifySystemPrompt(
  userId: string,
  options: { resourcesContext?: string } = {}
): Promise<string> {
  const userKnowledge = await memory.getUserKnowledge(userId);

  return buildClarifySystemPrompt({
    userKnowledge,
    resourcesContext: options.resourcesContext,
  });
}
