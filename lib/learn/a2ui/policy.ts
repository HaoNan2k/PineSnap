/**
 * Learn A2UI Tool Render Policy
 *
 * We intentionally keep this as **UI-only** configuration:
 * - It must NOT affect DB persistence.
 * - It must NOT affect DB→Model message construction.
 *
 * Why:
 * - `tool-result` messages (Role.tool) are facts for the model & audit.
 * - Rendering is a view concern; we merge/join tool-results into the UI layer.
 */
export type ToolResultRenderMode =
  /**
   * Do not create additional UI blocks for tool-result.
   *
   * Notes:
   * - We still mark the corresponding tool UI as read-only ("submitted") so it
   *   won't be re-submitted or edited during history replay.
   * - We may still attach `output` onto the existing tool UI part so the tool
   *   component can show the user's selection in read-only mode (no extra bubble).
   */
  | "none"
  /**
   * Render the tool-result as an inline card attached to the assistant bubble.
   *
   * Intended for tools like web search / retrieval where showing evidence is useful,
   * but we still MUST NOT create a separate "tool" bubble in the message list.
   */
  | "inline_card"
  /**
   * Render only sources / citations derived from tool-result.
   *
   * Useful when the raw tool output is large, but we want to expose references.
   * Still attached to the assistant bubble (no separate tool bubble).
   */
  | "sources_only";

export type LearnToolRenderPolicy = {
  toolName: string;
  /**
   * How tool-result should be visualized in the UI.
   *
   * This is strictly a UI concern. It should never change the ModelMessage schema.
   */
  renderToolResult: ToolResultRenderMode;
};

/**
 * Default policies for Learn.
 *
 * Current requirement:
 * - Render tool-call UI (quiz/fill-in-blank).
 * - Do NOT render tool-result as an extra bubble or separate message.
 */
export const LEARN_DEFAULT_TOOL_POLICIES: LearnToolRenderPolicy[] = [
  { toolName: "renderQuizSingle", renderToolResult: "none" },
  { toolName: "renderQuizMultiple", renderToolResult: "none" },
  { toolName: "renderFillInBlank", renderToolResult: "none" },
];

export function resolveLearnToolPolicy(
  toolName: string,
  policies: LearnToolRenderPolicy[] = LEARN_DEFAULT_TOOL_POLICIES
): LearnToolRenderPolicy {
  return (
    policies.find((p) => p.toolName === toolName) ?? {
      toolName,
      renderToolResult: "none",
    }
  );
}

