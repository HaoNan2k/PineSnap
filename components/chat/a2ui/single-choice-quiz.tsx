"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Check, Circle, X } from "lucide-react";

interface SingleChoiceQuizProps {
  question: string;
  options: string[];
  correctAnswer?: string;
  selectedOption?: string;
  onSelectOption?: (option: string) => void;
  isReadOnly?: boolean;
}

export const SingleChoiceQuiz = memo(function SingleChoiceQuiz({
  question,
  options,
  correctAnswer,
  selectedOption,
  onSelectOption,
  isReadOnly,
}: SingleChoiceQuizProps) {
  const hasAnswered = selectedOption !== undefined;
  const isCorrect = hasAnswered && correctAnswer && selectedOption === correctAnswer;
  const isWrong = hasAnswered && correctAnswer && selectedOption !== correctAnswer;

  return (
    <div className="p-4 my-2 w-full max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-6 rounded-full bg-forest/10 flex items-center justify-center text-forest">
          <span className="text-xs font-bold">Q</span>
        </div>
        <h3 className="text-base font-semibold text-foreground leading-tight">{question}</h3>
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedOption === option;
          const isThisCorrect = correctAnswer === option;
          const showCorrectHint = isWrong && isThisCorrect;

          return (
            <button
              key={option}
              disabled={isReadOnly || hasAnswered}
              onClick={() => !isReadOnly && !hasAnswered && onSelectOption?.(option)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between group",
                !isReadOnly && !hasAnswered && "hover:border-forest/50 hover:bg-forest/5 cursor-pointer",
                hasAnswered && "cursor-default",
                isSelected && isCorrect
                  ? "border-success bg-success/10 text-success font-medium"
                  : isSelected && isWrong
                    ? "border-error bg-error/10 text-error font-medium"
                    : showCorrectHint
                      ? "border-success/50 bg-success/5"
                      : isSelected
                        ? "border-forest bg-forest/10 text-forest-dark font-medium shadow-sm"
                        : "border-border bg-background text-text-secondary",
                (isReadOnly || hasAnswered) && !isSelected && !showCorrectHint && "opacity-50"
              )}
            >
              <span>{option}</span>
              {isSelected && isCorrect && (
                <Check className="size-4 text-success animate-in fade-in zoom-in" />
              )}
              {isSelected && isWrong && (
                <X className="size-4 text-error animate-in fade-in zoom-in" />
              )}
              {showCorrectHint && (
                <Check className="size-4 text-success/70 animate-in fade-in zoom-in" />
              )}
              {!isSelected && !showCorrectHint && !hasAnswered && !isReadOnly && (
                <Circle className="size-4 text-border group-hover:text-forest/50 transition-colors" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
