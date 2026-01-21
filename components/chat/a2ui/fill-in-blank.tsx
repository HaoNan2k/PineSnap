"use client";

import { cn } from "@/lib/utils";
import { PenTool } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FillInBlankProps {
  question: string;
  placeholder: string;
  answer?: string;
  onChange?: (val: string) => void;
  isReadOnly?: boolean;
}

export function FillInBlank({
  question,
  placeholder,
  answer = "",
  onChange,
  isReadOnly,
}: FillInBlankProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm my-2 w-full max-w-md">
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
          placeholder={placeholder}
          className={cn(
            "w-full pr-10 border-dashed border-2 focus-visible:ring-forest/20 focus-visible:border-forest transition-all",
            answer ? "bg-forest/5 text-forest font-medium border-forest/30" : "bg-background",
            isReadOnly && "opacity-80 cursor-default border-solid"
          )}
        />
        {isReadOnly && answer && (
           <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-forest/50 uppercase tracking-wider">
             Submitted
           </div>
        )}
      </div>
    </div>
  );
}
