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
    "2. 适当时使用工具 (renderQuizSingle, renderQuizMultiple, renderFillInBlank, renderSocraticBranch) 来测试理解。",
    "3. 你可以一次调用多个工具 (Parallel Tools)。",
    "4. 不要直接给出答案，而是提出引导性问题。",
    "5. 当用户掌握了某个概念时，调用 markConceptCovered 标记该概念。",
    "6. 保持语言简洁、专业且具有鼓励性。"
  );

  return promptParts.join("\n");
}

interface BuildClarifySystemPromptParams {
  userKnowledge: string;
  resourcesContext?: string;
}

export function buildClarifySystemPrompt({
  userKnowledge,
  resourcesContext,
}: BuildClarifySystemPromptParams): string {
  const promptParts = [
    "你是 PineSnap 的学习规划助手。当前学习计划尚未生成。",
    "你的唯一目标是：了解用户的学习目标和背景，然后生成一个结构化的学习计划。",
    "",
    `用户知识背景：${userKnowledge}`,
  ];

  if (resourcesContext) {
    promptParts.push("", "素材上下文：", resourcesContext);
  }

  promptParts.push(
    "",
    "你的行为准则：",
    "1. 向用户提出 2-3 个澄清问题，了解他们的学习目标、已有知识水平、可投入时间。",
    "2. 收到足够信息后，生成一个 Markdown 格式的学习计划并调用 savePlan 工具保存。",
    "3. 学习计划应包含：学习目标、概念清单（按依赖顺序）、每个概念的预计步骤。",
    "4. 不要使用任何测试工具（renderQuizSingle 等），你在澄清模式下只能使用 savePlan。",
    "5. 保持语言简洁、友好。"
  );

  return promptParts.join("\n");
}

