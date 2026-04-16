"use client";

import { cn } from "@/lib/utils";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface SocraticBranchProps {
  question: string;
  selectedOption?: "yes" | "no";
  onSelect?: (option: "yes" | "no") => void;
  isReadOnly?: boolean;
}

export function SocraticBranch({
  question,
  selectedOption,
  onSelect,
  isReadOnly,
}: SocraticBranchProps) {
  const hasAnswered = selectedOption !== undefined;

  return (
    <div className="p-4 my-2 w-full max-w-2xl">
      <h3 className="text-base font-semibold text-foreground leading-tight mb-4">
        {question}
      </h3>
      <div className="flex gap-3">
        {(["yes", "no"] as const).map((option) => {
          const isSelected = selectedOption === option;
          const Icon = option === "yes" ? ThumbsUp : ThumbsDown;
          const label = option === "yes" ? "Yes" : "No";

          return (
            <button
              key={option}
              disabled={isReadOnly || hasAnswered}
              onClick={() => !isReadOnly && !hasAnswered && onSelect?.(option)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-all duration-200 font-medium text-sm",
                !isReadOnly && !hasAnswered && "hover:border-forest/50 hover:bg-forest/5 cursor-pointer",
                hasAnswered && "cursor-default",
                isSelected
                  ? "border-forest bg-forest/10 text-forest"
                  : "border-border bg-background text-text-secondary",
                hasAnswered && !isSelected && "opacity-40"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
