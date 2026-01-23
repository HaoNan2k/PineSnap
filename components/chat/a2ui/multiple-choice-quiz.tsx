"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MultipleChoiceQuizProps {
  question: string;
  options: string[];
  selectedOptions?: string[];
  onToggleOption?: (option: string) => void;
  isReadOnly?: boolean;
}

export function MultipleChoiceQuiz({
  question,
  options,
  selectedOptions = [],
  onToggleOption,
  isReadOnly,
}: MultipleChoiceQuizProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm my-2 w-full max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-6 rounded-full bg-forest/10 flex items-center justify-center text-forest">
          <span className="text-xs font-bold">M</span>
        </div>
        <h3 className="text-base font-semibold text-foreground leading-tight">{question}</h3>
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = selectedOptions.includes(option);
          return (
            <button
              key={option}
              disabled={isReadOnly}
              onClick={() => !isReadOnly && onToggleOption?.(option)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-md border transition-all duration-200 flex items-center justify-between group",
                !isReadOnly && "hover:border-forest/50 hover:bg-forest/5",
                isSelected
                  ? "border-forest bg-forest/10 text-forest-dark font-medium shadow-sm"
                  : "border-border bg-background text-text-secondary",
                isReadOnly && !isSelected && "opacity-50 grayscale",
                isReadOnly && isSelected && "opacity-100 ring-1 ring-forest border-forest"
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
    </div>
  );
}
