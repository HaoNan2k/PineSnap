import { memory } from "@/lib/chat/memory";
import { buildLearnSystemPrompt } from "@/lib/learn/prompts/context-system-prompt";

interface ContextOptions {
  learningPlan?: string;
  resourcesContext?: string;
}

export async function getContextSystemPrompt(
  userId: string,
  options: ContextOptions = {}
): Promise<string> {
  // 1. Get User Knowledge
  const userKnowledge = await memory.getUserKnowledge(userId);

  // 2. Use provided plan/context (DB access happens in lib/db)
  const learningPlan =
    options.learningPlan ?? "No specific learning plan active.";
  const resourcesContext = options.resourcesContext;

  return buildLearnSystemPrompt({
    userKnowledge,
    learningPlan,
    resourcesContext,
  });
}
