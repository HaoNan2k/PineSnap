"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { PenTool } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FillInBlankProps {
  question: string;
  placeholder: string;
  correctAnswer?: string;
  answer?: string;
  onChange?: (val: string) => void;
  onSubmit?: () => void;
  isReadOnly?: boolean;
}

export const FillInBlank = memo(function FillInBlank({
  question,
  placeholder,
  correctAnswer,
  answer = "",
  onChange,
  onSubmit,
  isReadOnly,
}: FillInBlankProps) {
  const isSubmitted = isReadOnly && answer;
  const isCorrect = isSubmitted && correctAnswer && answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  const isWrong = isSubmitted && correctAnswer && answer.trim().toLowerCase() !== correctAnswer.trim().toLowerCase();

  return (
    <div className="p-4 my-2 w-full max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-6 rounded-full bg-forest/10 flex items-center justify-center text-forest">
          <PenTool className="size-3" />
        </div>
        <h3 className="text-base font-semibold text-foreground leading-tight">{question}</h3>
      </div>
      <div className="relative">
        <Input
          disabled={isReadOnly}
          value={answer}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && answer.trim() && onSubmit) {
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className={cn(
            "w-full pr-10 border-dashed border-2 focus-visible:ring-forest/20 focus-visible:border-forest transition-all",
            isCorrect
              ? "bg-success/5 text-success font-medium border-success/30"
              : isWrong
                ? "bg-error/5 text-error font-medium border-error/30"
                : answer
                  ? "bg-forest/5 text-forest font-medium border-forest/30"
                  : "bg-background",
            isReadOnly && "cursor-default border-solid"
          )}
        />
        {isWrong && correctAnswer && (
          <div className="mt-2 text-sm text-success">
            Correct answer: {correctAnswer}
          </div>
        )}
      </div>
      {!isReadOnly && answer.trim() && onSubmit && (
        <button
          onClick={onSubmit}
          className="mt-3 px-4 py-2 rounded-lg bg-forest text-white font-medium text-sm hover:bg-forest-dark transition-colors"
        >
          Submit
        </button>
      )}
    </div>
  );
});
