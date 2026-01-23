"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { SingleChoiceQuiz } from "./single-choice-quiz";
import { MultipleChoiceQuiz } from "./multiple-choice-quiz";
import { FillInBlank } from "./fill-in-blank";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getToolInvocationsFromLastStep } from "@/lib/chat/utils";

export type A2UIAddToolResult =
  | {
      tool: string;
      toolCallId: string;
      output: unknown;
      state?: "output-available";
      errorText?: undefined;
    }
  | {
      tool: string;
      toolCallId: string;
      output?: undefined;
      state: "output-error";
      errorText: string;
    };

interface A2UIRendererProps {
  parts: UIMessage["parts"] | undefined;
  addToolResult?: (payload: A2UIAddToolResult) => void;
}

type A2UIValue =
  | string
  | string[]
  | Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function A2UIRenderer({ parts, addToolResult }: A2UIRendererProps) {
  const [values, setValues] = useState<Record<string, A2UIValue>>({});

  const a2uiInvocations = getToolInvocationsFromLastStep(parts);
  if (a2uiInvocations.length === 0) return null;

  const pendingTools = a2uiInvocations.filter((t) => !t.isReadOnly);
  const hasPending = pendingTools.length > 0;
  const missingTools = pendingTools.filter(
    (tool) => values[tool.toolCallId] === undefined
  );
  const canSubmit = Boolean(addToolResult) && missingTools.length === 0;

  const handleUpdateValue = (toolCallId: string, value: A2UIValue) => {
    setValues((prev) => ({ ...prev, [toolCallId]: value }));
  };

  const handleSubmitAll = () => {
    if (!addToolResult || missingTools.length > 0) return;
    pendingTools.forEach((tool) => {
      const value = values[tool.toolCallId];
      if (value === undefined) return;

      let output: Record<string, unknown> = {};
      if (tool.toolName === "renderQuizSingle") output = { selection: value };
      else if (tool.toolName === "renderQuizMultiple") output = { selections: value };
      else if (tool.toolName === "renderFillInBlank") output = { answer: value };

      addToolResult({
        tool: tool.toolName,
        toolCallId: tool.toolCallId,
        output,
      });
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div
        className={cn(
          "grid gap-4 w-full",
          a2uiInvocations.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        )}
      >
        {a2uiInvocations.map((tool) => {
          const { toolName, toolCallId, args, result, isReadOnly } = tool;

          switch (toolName) {
            case "renderQuizSingle":
              return (
                <SingleChoiceQuiz
                  key={toolCallId}
                  question={typeof args.question === "string" ? args.question : ""}
                  options={
                    Array.isArray(args.options)
                      ? args.options.filter((x): x is string => typeof x === "string")
                      : []
                  }
                  isReadOnly={isReadOnly}
                  selectedOption={
                    (isRecord(result) && typeof result["selection"] === "string"
                      ? result["selection"]
                      : undefined) ??
                    (typeof values[toolCallId] === "string"
                      ? (values[toolCallId] as string)
                      : undefined)
                  }
                  onSelectOption={(val) => handleUpdateValue(toolCallId, val)}
                />
              );
            case "renderQuizMultiple":
              return (
                <MultipleChoiceQuiz
                  key={toolCallId}
                  question={typeof args.question === "string" ? args.question : ""}
                  options={
                    Array.isArray(args.options)
                      ? args.options.filter((x): x is string => typeof x === "string")
                      : []
                  }
                  isReadOnly={isReadOnly}
                  selectedOptions={
                    (isRecord(result) && Array.isArray(result["selections"])
                      ? (result["selections"].filter(
                          (x): x is string => typeof x === "string"
                        ) as string[])
                      : undefined) ??
                    (Array.isArray(values[toolCallId]) &&
                    (values[toolCallId] as unknown[]).every(
                      (x) => typeof x === "string"
                    )
                      ? (values[toolCallId] as string[])
                      : undefined)
                  }
                  onToggleOption={(val) => {
                    const current = (values[toolCallId] as string[]) || [];
                    const next = current.includes(val)
                      ? current.filter((c) => c !== val)
                      : [...current, val];
                    handleUpdateValue(toolCallId, next);
                  }}
                />
              );
            case "renderFillInBlank":
              return (
                <FillInBlank
                  key={toolCallId}
                  question={typeof args.question === "string" ? args.question : ""}
                  placeholder={
                    typeof args.placeholder === "string" ? args.placeholder : "..."
                  }
                  isReadOnly={isReadOnly}
                  answer={
                    (isRecord(result) && typeof result["answer"] === "string"
                      ? result["answer"]
                      : undefined) ??
                    (typeof values[toolCallId] === "string"
                      ? (values[toolCallId] as string)
                      : undefined)
                  }
                  onChange={(val) => handleUpdateValue(toolCallId, val)}
                />
              );
            default:
              // TODO(a2ui): Replace with user-facing fallback when copy is finalized.
              return (
                <div
                  key={toolCallId}
                  className="p-4 border border-dashed rounded bg-muted text-xs text-muted-foreground"
                >
                  Unknown Tool: {toolName}
                </div>
              );
          }
        })}
      </div>

      {hasPending && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitAll}
            disabled={!canSubmit}
            className="bg-forest hover:bg-forest/90 text-white font-semibold shadow-md transition-all active:scale-95"
          >
            Submit All
          </Button>
        </div>
      )}
      {hasPending && missingTools.length > 0 && (
        <div className="text-xs text-muted-foreground">
          完成所有题目后再提交。
        </div>
      )}
    </div>
  );
}
