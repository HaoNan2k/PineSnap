"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MultipleChoiceQuizProps {
  question: string;
  options: string[];
  correctAnswers?: string[];
  selectedOptions?: string[];
  onToggleOption?: (option: string) => void;
  onConfirm?: () => void;
  isReadOnly?: boolean;
}

export const MultipleChoiceQuiz = memo(function MultipleChoiceQuiz({
  question,
  options,
  correctAnswers,
  selectedOptions = [],
  onToggleOption,
  onConfirm,
  isReadOnly,
}: MultipleChoiceQuizProps) {
  const hasConfirmed = isReadOnly;
  const hasSelections = selectedOptions.length > 0;

  return (
    <div className="p-4 my-2 w-full max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-6 rounded-full bg-forest/10 flex items-center justify-center text-forest">
          <span className="text-xs font-bold">M</span>
        </div>
        <h3 className="text-base font-semibold text-foreground leading-tight">{question}</h3>
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedOptions.includes(option);
          const isCorrectOption = correctAnswers?.includes(option);
          const showCorrectHint = hasConfirmed && isCorrectOption && !isSelected;
          const showWrongHint = hasConfirmed && isSelected && !isCorrectOption;

          return (
            <button
              key={option}
              disabled={hasConfirmed}
              onClick={() => !hasConfirmed && onToggleOption?.(option)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between group",
                !hasConfirmed && "hover:border-forest/50 hover:bg-forest/5 cursor-pointer",
                hasConfirmed && "cursor-default",
                hasConfirmed && isSelected && isCorrectOption
                  ? "border-success bg-success/10 text-success font-medium"
                  : showWrongHint
                    ? "border-error bg-error/10 text-error font-medium"
                    : showCorrectHint
                      ? "border-success/50 bg-success/5"
                      : isSelected
                        ? "border-forest bg-forest/10 text-forest-dark font-medium shadow-sm"
                        : "border-border bg-background text-text-secondary",
                hasConfirmed && !isSelected && !showCorrectHint && "opacity-50"
              )}
            >
              <span>{option}</span>
              <div className={cn(
                "size-4 border rounded-sm flex items-center justify-center transition-colors",
                isSelected ? "bg-forest border-forest" : "border-muted-foreground/30 group-hover:border-forest/50"
              )}>
                {isSelected && <Check className="size-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
      {!hasConfirmed && hasSelections && onConfirm && (
        <button
          onClick={onConfirm}
          className="mt-3 px-4 py-2 rounded-lg bg-forest text-white font-medium text-sm hover:bg-forest-dark transition-colors"
        >
          Confirm
        </button>
      )}
    </div>
  );
});
