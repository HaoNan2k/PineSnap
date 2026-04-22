"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasStepNavigationProps {
  /** 0-based index of the step currently shown on canvas. */
  displayedStepIndex: number;
  /** Total number of steps available (including current). */
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Left + right edge buttons for canvas previous/next navigation.
 *
 * Decoupled from sidebar (Light Anchor decision): this changes ONLY
 * the displayed canvas step. Sidebar discussion timeline stays put.
 *
 * Buttons are absolute-positioned at the canvas vertical mid-edge so
 * they don't compete with the step content for space.
 */
export function CanvasStepNavigation({
  displayedStepIndex,
  totalSteps,
  onPrev,
  onNext,
}: CanvasStepNavigationProps) {
  const canPrev = displayedStepIndex > 0;
  const canNext = displayedStepIndex < totalSteps - 1;

  if (!canPrev && !canNext) return null;

  return (
    <>
      {canPrev && (
        <button
          onClick={onPrev}
          aria-label="上一步"
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-10",
            "size-10 rounded-full flex items-center justify-center",
            "bg-surface/80 backdrop-blur-sm border border-border-light",
            "text-text-secondary hover:text-text-main hover:bg-cream-warm",
            "transition-colors shadow-sm"
          )}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {canNext && (
        <button
          onClick={onNext}
          aria-label="下一步"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-10",
            "size-10 rounded-full flex items-center justify-center",
            "bg-surface/80 backdrop-blur-sm border border-border-light",
            "text-text-secondary hover:text-text-main hover:bg-cream-warm",
            "transition-colors shadow-sm"
          )}
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </>
  );
}
