"use client";

import { memo, useState, useCallback, useEffect } from "react";
import type { UIMessage } from "ai";
import { SingleChoiceQuiz } from "./single-choice-quiz";
import { MultipleChoiceQuiz } from "./multiple-choice-quiz";
import { FillInBlank } from "./fill-in-blank";
import { SocraticBranch } from "./socratic-branch";
import { Response } from "@/components/chat/components/response";
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
  /** Canvas mode: report pending values instead of submitting immediately */
  onPendingChange?: (toolCallId: string, value: unknown | undefined) => void;
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
 * Build the output shape for a given tool + value.
 */
function buildToolOutput(toolName: string, val: A2UIValue): Record<string, unknown> {
  if (toolName === "renderQuizSingle") return { selection: val };
  if (toolName === "renderQuizMultiple") return { selections: val };
  if (toolName === "renderFillInBlank") return { answer: val };
  if (toolName === "renderSocraticBranch") return { answer: val };
  if (toolName === "presentContent") return { acknowledged: true };
  return {};
}

/**
 * Each tool invocation gets its own state via this wrapper,
 * so updating one quiz doesn't re-render siblings.
 */
const ToolInvocationItem = memo(function ToolInvocationItem({
  tool,
  addToolResult,
  onPendingChange,
}: {
  tool: ToolInvocation;
  addToolResult?: (payload: A2UIAddToolResult) => void;
  onPendingChange?: (toolCallId: string, value: unknown | undefined) => void;
}) {
  const [value, setValue] = useState<A2UIValue | undefined>(undefined);
  const { toolName, toolCallId, args, result } = tool;

  // Force read-only when neither submission channel is available — prevents
  // historical canvas steps from accepting click input that would silently
  // discard. Belt-and-suspenders on top of tool.isReadOnly which already
  // covers the common "tool already has result" case.
  const isReadOnly = tool.isReadOnly || (!onPendingChange && !addToolResult);

  const isCanvasMode = !!onPendingChange;

  // For presentContent: auto-report pending as soon as it renders
  useEffect(() => {
    if (toolName === "presentContent" && onPendingChange && !isReadOnly) {
      onPendingChange(toolCallId, { acknowledged: true });
    }
  }, [toolName, toolCallId, onPendingChange, isReadOnly]);

  // In non-canvas mode (chat drawer), submit immediately on interaction
  const submitDirect = useCallback(
    (val: A2UIValue) => {
      if (!addToolResult || isCanvasMode) return;
      addToolResult({
        tool: toolName,
        toolCallId,
        output: buildToolOutput(toolName, val),
      });
    },
    [addToolResult, isCanvasMode, toolName, toolCallId]
  );

  // In canvas mode, report pending value
  const reportPending = useCallback(
    (val: A2UIValue) => {
      if (!onPendingChange) return;
      onPendingChange(toolCallId, buildToolOutput(toolName, val));
    },
    [onPendingChange, toolName, toolCallId]
  );

  const handleValueChange = useCallback(
    (val: A2UIValue) => {
      setValue(val);
      if (isCanvasMode) {
        reportPending(val);
      } else {
        submitDirect(val);
      }
    },
    [isCanvasMode, reportPending, submitDirect]
  );

  switch (toolName) {
    case "presentContent":
      return (
        <div className="text-text-main text-base leading-relaxed">
          <Response>
            {typeof args.markdown === "string" ? args.markdown : ""}
          </Response>
        </div>
      );
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
          onSelectOption={(val) => handleValueChange(val)}
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
            if (isCanvasMode) {
              reportPending(next);
            }
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
          onChange={(val) => {
            setValue(val);
            if (isCanvasMode && val.trim()) {
              reportPending(val);
            } else if (isCanvasMode && !val.trim()) {
              onPendingChange?.(toolCallId, undefined);
            }
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
          onSelect={(val) => handleValueChange(val)}
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

export function A2UIRenderer({ parts, addToolResult, onPendingChange }: A2UIRendererProps) {
  const a2uiInvocations = getToolInvocationsFromLastStep(parts);
  if (a2uiInvocations.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 w-full">
      {a2uiInvocations.map((tool) => (
        <ToolInvocationItem
          key={tool.toolCallId}
          tool={tool}
          addToolResult={addToolResult}
          onPendingChange={onPendingChange}
        />
      ))}
    </div>
  );
}
