"use client";

import { A2UIRenderer, type A2UIAddToolResult } from "@/components/chat/a2ui/renderer";
import { Skeleton } from "@/components/ui/skeleton";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { CanvasStepNavigation } from "./canvas-step-navigation";
import type { A2UIToolInvocation } from "@/lib/chat/utils";

interface LearningCanvasProps {
  toolInvocations: A2UIToolInvocation[];
  parts: UIMessage["parts"] | undefined;
  totalSteps: number;
  /** 0-based displayed step (may be a historical step != latest). */
  currentStepIndex: number;
  /** True when displayed step is not the latest (historical replay). */
  isHistorical: boolean;
  isBusy: boolean;
  canContinue: boolean;
  onContinue: () => void;
  onPrev: () => void;
  onNext: () => void;
  addToolResult?: (payload: A2UIAddToolResult) => void;
  onPendingChange?: (toolCallId: string, value: unknown | undefined) => void;
  isGated: boolean;
  isError: boolean;
}

export function LearningCanvas({
  toolInvocations,
  parts,
  totalSteps,
  currentStepIndex,
  isHistorical,
  isBusy,
  canContinue,
  onContinue,
  onPrev,
  onNext,
  addToolResult,
  onPendingChange,
  isGated,
  isError,
}: LearningCanvasProps) {
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;
  const hasTools = toolInvocations.length > 0;

  return (
    <div className="flex flex-col h-full flex-1 min-w-0">
      {/* Progress bar */}
      <div className="w-full h-1 bg-border-light shrink-0">
        <div
          className="h-full bg-forest transition-all duration-500 ease-out rounded-full"
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>

      {/* Canvas content area */}
      <div className="flex-1 overflow-y-auto relative">
        <CanvasStepNavigation
          displayedStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onPrev={onPrev}
          onNext={onNext}
        />
        <div className="max-w-2xl mx-auto px-6 py-10">
          {isGated ? (
            <div className="space-y-3 animate-pulse">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-error text-sm">生成失败，请稍后重试。</p>
            </div>
          ) : !hasTools ? (
            <CanvasSkeleton />
          ) : (
            <A2UIRenderer
              parts={parts}
              addToolResult={addToolResult}
              // Historical steps are read-only: pass through addToolResult /
              // onPendingChange undefined so widgets render their selections
              // but do not accept new input.
              onPendingChange={isHistorical ? undefined : onPendingChange}
            />
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-border-light bg-surface/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          {isHistorical ? (
            <span className="text-xs text-forest-muted">
              这是历史步骤 (read-only)
            </span>
          ) : (
            <span />
          )}

          {!isHistorical && (
            <button
              onClick={onContinue}
              disabled={isBusy || !canContinue}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium text-sm transition-all",
                "bg-forest text-white hover:bg-forest-dark active:scale-[0.97]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isBusy ? "Thinking..." : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CanvasSkeleton() {
  return (
    <div className="space-y-4 py-8">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
      <div className="pt-4">
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
