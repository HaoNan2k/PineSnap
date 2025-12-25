"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ActionsProps = React.ComponentProps<"div">;

export const Actions = ({ className, children, ...props }: ActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type ActionProps = React.ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const Action = ({
  tooltip,
  children,
  label,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: ActionProps) => {
  const button = (
    <Button
      className={cn(
        "relative size-6 p-1 text-muted-foreground hover:text-foreground h-auto w-auto",
        className
      )}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

interface MessageActionsProps {
  message: { role: string; content: string };
  isLoading?: boolean;
}

export function MessageActions({ message, isLoading }: MessageActionsProps) {
  const [isCopied, setIsCopied] = useState(false);

  if (isLoading) {
    return null;
  }

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end">
        <div className="relative">
          <Action onClick={handleCopy} tooltip="复制">
            {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <Actions className="-ml-0.5">
      <Action onClick={handleCopy} tooltip="复制">
        {isCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Action>
    </Actions>
  );
}

