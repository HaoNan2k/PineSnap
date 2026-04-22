interface CanvasStepSummary {
  /** 1-based index in canvas conversation step order. */
  stepNumber: number;
  /** Short topic / question / heading derived from the step's tool input. */
  title: string;
}

interface BuildDiscussionSystemPromptParams {
  userKnowledge: string;
  learningPlan: string;
  resourcesContext?: string;
  /** Map of canvas step assistant messages, in order. Used to give the AI a topical map without bulky tool args. */
  canvasStepMap: CanvasStepSummary[];
  /** 1-based index of the step the user was on when they submitted the question. */
  currentStepNumber: number;
}

/**
 * System prompt for the discussion (chat) AI tutor that lives in the right
 * sidebar of the learning page.
 *
 * Hard constraints baked into the prompt:
 *   - Output MUST be plain text. No tool calls available — the API endpoint
 *     does not register any tools. This is belt-and-suspenders.
 *   - Discussion AI MUST NOT instruct the user to take canvas-side actions
 *     (e.g. "I picked the next quiz for you") or simulate tool calls in text.
 *   - Discussion AI sees the full chat conversation history, plus a topical
 *     map of canvas steps. Light Anchor (see docs/decisions/0003) means
 *     cross-step references are natural.
 */
export function buildDiscussionSystemPrompt({
  userKnowledge,
  learningPlan,
  resourcesContext,
  canvasStepMap,
  currentStepNumber,
}: BuildDiscussionSystemPromptParams): string {
  const promptParts = [
    "你是 PineSnap 的答疑助教。学生正在通过 canvas 主线进行结构化学习；你只负责在右侧边栏回答学生关于学习内容的提问。",
    "",
    `用户知识背景：${userKnowledge}`,
  ];

  if (resourcesContext) {
    promptParts.push("", "素材上下文：", resourcesContext);
  }

  promptParts.push("", "学习计划（Markdown）：", learningPlan);

  promptParts.push(
    "",
    "学生 canvas 学习路径（每步的题目主题）：",
    ...canvasStepMap.map(
      (s) =>
        `- step ${s.stepNumber}${s.stepNumber === currentStepNumber ? "（学生当前所在步）" : ""}: ${s.title}`
    )
  );

  promptParts.push(
    "",
    "你的行为准则：",
    "1. 只输出纯文本。**不要**模拟 tool call，**不要**写 JSON 或 function 调用语法。系统不会把你的输出当作 canvas 的一部分渲染。",
    "2. **不要**指挥学生在 canvas 上做任何具体操作（例如不要说 \"我已经为你点了下一题\"、\"现在去答 quiz\" 这类话）。学生 canvas 进度由他自己控制。",
    "3. 你看得见学生整段讨论历史，可以自然引用之前问过的问题（例如 \"你刚才问到 anon_key 时，我说过…，这道题也是同一个原理\"）。",
    "4. 学生提的问题如果跨 step（\"你之前讲的 X 是什么意思\"），结合上面的 canvas 路径地图回忆相关 step 的主题。如果不确定，反问澄清，不要瞎编。",
    "5. 解释要克制：先一句话直答，再补简短例子或追问。学生在 canvas 上有时间紧迫感，长篇大论会打断学习节奏。",
    "6. 用学生熟悉的语言（中文为主），保持鼓励但不浮夸。",
    "7. 如果学生问了一个超出当前学习计划范围的问题，可以简短答复 + 提示 \"这超出我们这次学习的范围了，之后想专门学 X 可以再开新一轮\"。"
  );

  return promptParts.join("\n");
}
