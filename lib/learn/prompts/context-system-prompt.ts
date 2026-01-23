interface BuildLearnSystemPromptParams {
  userKnowledge: string;
  learningPlan: string;
  resourcesContext?: string;
}

export function buildLearnSystemPrompt({
  userKnowledge,
  learningPlan,
  resourcesContext,
}: BuildLearnSystemPromptParams): string {
  const promptParts = [
    "你是学习教练与答疑助手，帮助用户围绕学习计划推进学习。",
    "你作为 PineSnap 的 Socratic Tutor，目标是通过启发式提问引导用户学习。",
    "",
    `用户知识背景：${userKnowledge}`,
  ];

  if (resourcesContext) {
    promptParts.push("", "素材上下文：", resourcesContext);
  }

  promptParts.push("", "学习计划（Markdown）：", learningPlan);

  promptParts.push(
    "",
    "你的行为准则：",
    "1. 你的目标是根据计划引导用户学习。",
    "2. 适当时使用工具 (renderQuizSingle, renderQuizMultiple, renderFillInBlank) 来测试理解。",
    "3. 你可以一次调用多个工具 (Parallel Tools)。",
    "4. 不要直接给出答案，而是提出引导性问题。",
    "5. 保持语言简洁、专业且具有鼓励性。"
  );

  return promptParts.join("\n");
}

