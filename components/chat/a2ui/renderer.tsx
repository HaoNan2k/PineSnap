"use client";

import { memo, useState, useCallback } from "react";
import type { UIMessage } from "ai";
import { SingleChoiceQuiz } from "./single-choice-quiz";
import { MultipleChoiceQuiz } from "./multiple-choice-quiz";
import { FillInBlank } from "./fill-in-blank";
import { SocraticBranch } from "./socratic-branch";
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

interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  args: Record<string, unknown>;
  result?: unknown;
  isReadOnly: boolean;
}

/**
 * Each tool invocation gets its own state via this wrapper,
 * so updating one quiz doesn't re-render siblings.
 */
const ToolInvocationItem = memo(function ToolInvocationItem({
  tool,
  addToolResult,
}: {
  tool: ToolInvocation;
  addToolResult?: (payload: A2UIAddToolResult) => void;
}) {
  const [value, setValue] = useState<A2UIValue | undefined>(undefined);
  const { toolName, toolCallId, args, result, isReadOnly } = tool;

  const submitOne = useCallback(
    (val: A2UIValue) => {
      if (!addToolResult) return;
      let output: Record<string, unknown> = {};
      if (toolName === "renderQuizSingle") output = { selection: val };
      else if (toolName === "renderQuizMultiple") output = { selections: val };
      else if (toolName === "renderFillInBlank") output = { answer: val };
      else if (toolName === "renderSocraticBranch") output = { answer: val };

      addToolResult({
        tool: toolName,
        toolCallId,
        output,
      });
    },
    [addToolResult, toolName, toolCallId]
  );

  switch (toolName) {
    case "renderQuizSingle":
      return (
        <SingleChoiceQuiz
          question={typeof args.question === "string" ? args.question : ""}
          options={
            Array.isArray(args.options)
              ? args.options.filter((x): x is string => typeof x === "string")
              : []
          }
          correctAnswer={typeof args.correctAnswer === "string" ? args.correctAnswer : undefined}
          isReadOnly={isReadOnly}
          selectedOption={
            (isRecord(result) && typeof result["selection"] === "string"
              ? result["selection"]
              : undefined) ??
            (typeof value === "string" ? value : undefined)
          }
          onSelectOption={(val) => {
            setValue(val);
            submitOne(val);
          }}
        />
      );
    case "renderQuizMultiple":
      return (
        <MultipleChoiceQuiz
          question={typeof args.question === "string" ? args.question : ""}
          options={
            Array.isArray(args.options)
              ? args.options.filter((x): x is string => typeof x === "string")
              : []
          }
          correctAnswers={
            Array.isArray(args.correctAnswers)
              ? args.correctAnswers.filter((x): x is string => typeof x === "string")
              : undefined
          }
          isReadOnly={isReadOnly}
          selectedOptions={
            (isRecord(result) && Array.isArray(result["selections"])
              ? (result["selections"].filter(
                  (x): x is string => typeof x === "string"
                ) as string[])
              : undefined) ??
            (Array.isArray(value) &&
            (value as unknown[]).every((x) => typeof x === "string")
              ? (value as string[])
              : undefined)
          }
          onToggleOption={(val) => {
            const current = (value as string[]) || [];
            const next = current.includes(val)
              ? current.filter((c) => c !== val)
              : [...current, val];
            setValue(next);
          }}
          onConfirm={() => {
            if (value) submitOne(value);
          }}
        />
      );
    case "renderFillInBlank":
      return (
        <FillInBlank
          question={typeof args.question === "string" ? args.question : ""}
          placeholder={
            typeof args.placeholder === "string" ? args.placeholder : "..."
          }
          correctAnswer={typeof args.correctAnswer === "string" ? args.correctAnswer : undefined}
          isReadOnly={isReadOnly}
          answer={
            (isRecord(result) && typeof result["answer"] === "string"
              ? result["answer"]
              : undefined) ??
            (typeof value === "string" ? value : undefined)
          }
          onChange={(val) => setValue(val)}
          onSubmit={() => {
            if (value) submitOne(value);
          }}
        />
      );
    case "renderSocraticBranch":
      return (
        <SocraticBranch
          question={typeof args.question === "string" ? args.question : ""}
          isReadOnly={isReadOnly}
          selectedOption={
            (isRecord(result) && typeof result["answer"] === "string"
              ? (result["answer"] as "yes" | "no")
              : undefined) ??
            (typeof value === "string"
              ? (value as "yes" | "no")
              : undefined)
          }
          onSelect={(val) => {
            setValue(val);
            submitOne(val);
          }}
        />
      );
    default:
      return (
        <div className="p-4 border border-dashed rounded bg-muted text-xs text-muted-foreground">
          Unknown Tool: {toolName}
        </div>
      );
  }
});

export function A2UIRenderer({ parts, addToolResult }: A2UIRendererProps) {
  const a2uiInvocations = getToolInvocationsFromLastStep(parts);
  if (a2uiInvocations.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 w-full">
      {a2uiInvocations.map((tool) => (
        <ToolInvocationItem
          key={tool.toolCallId}
          tool={tool}
          addToolResult={addToolResult}
        />
      ))}
    </div>
  );
}
