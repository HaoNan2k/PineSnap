import type { ReactNode } from "react";
import { MessageRole } from "@/components/chat/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";

export const MessageRow = ({
  role,
  children,
  createdAt,
}: {
  role: MessageRole;
  children: ReactNode;
  createdAt?: number | Date;
}) => {
  const isUser = role === MessageRole.USER;

  const formatTime = (dateInput?: number | Date) => {
    if (!dateInput) return "";
    const date = typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`group flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* ... */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
        </div>

        {/* Message Meta */}
        <div
          className={`flex items-center gap-2 mt-2 ${isUser ? "flex-row-reverse" : ""}`}
        >
          <span className="text-xs text-gray-400">{formatTime(createdAt)}</span>

          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
