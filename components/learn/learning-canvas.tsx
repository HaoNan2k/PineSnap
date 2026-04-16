"use client";

import { Response } from "@/components/chat/components/response";
import { A2UIRenderer, type A2UIAddToolResult } from "@/components/chat/a2ui/renderer";
import { Skeleton } from "@/components/ui/skeleton";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

interface CanvasStep {
  id: string;
  content: string;
  parts: UIMessage["parts"] | undefined;
  hasA2UI: boolean;
  isGated: boolean;
  isError: boolean;
}

interface LearningCanvasProps {
  currentStep: CanvasStep | null;
  totalSteps: number;
  currentStepIndex: number;
  isBusy: boolean;
  onContinue: () => void;
  onOpenDrawer: () => void;
  addToolResult?: (payload: A2UIAddToolResult) => void;
}

export function LearningCanvas({
  currentStep,
  totalSteps,
  currentStepIndex,
  isBusy,
  onContinue,
  onOpenDrawer,
  addToolResult,
}: LearningCanvasProps) {
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Progress bar */}
      <div className="w-full h-1 bg-border-light shrink-0">
        <div
          className="h-full bg-forest transition-all duration-500 ease-out rounded-full"
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>

      {/* Canvas content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {!currentStep ? (
            <CanvasSkeleton />
          ) : currentStep.isGated ? (
            <div className="space-y-3 animate-pulse">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : currentStep.isError ? (
            <div className="text-center py-12">
              <p className="text-error text-sm">生成失败，请稍后重试。</p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentStep.content && (
                <div className="text-text-main text-base leading-relaxed">
                  <Response>{currentStep.content}</Response>
                </div>
              )}
              {currentStep.hasA2UI && (
                <A2UIRenderer
                  parts={currentStep.parts}
                  addToolResult={addToolResult}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t border-border-light bg-surface/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onOpenDrawer}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary",
              "hover:bg-forest/5 hover:text-forest transition-colors"
            )}
          >
            <MessageCircle className="size-4" />
            Chat
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onContinue}
              disabled={isBusy}
              className={cn(
                "px-6 py-2.5 rounded-lg font-medium text-sm transition-all",
                "bg-forest text-white hover:bg-forest-dark active:scale-[0.97]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isBusy ? "Thinking..." : "Continue"}
            </button>
          </div>
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
