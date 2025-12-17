import { useState, type FormEvent, useRef, type KeyboardEvent } from "react";
import { Paperclip, Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const MessageInput = ({
  onSend,
  disabled,
}: {
  onSend: (content: string, files?: FileList) => void;
  disabled?: boolean;
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileList | undefined>(undefined);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (disabled) return;
    const hasText = input.trim().length > 0;
    const hasFiles = (files?.length ?? 0) > 0;
    if (!hasText && !hasFiles) return;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/7084e3ee-1c7f-4437-8343-0f23286e4755',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageInput.tsx:19',message:'handleSubmit calling onSend',data:{inputType:typeof input,inputValue:input,inputLength:input.length,isNull:input===null,isUndefined:input===undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    onSend(input, files);
    setInput("");
    setFiles(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-100 bg-white px-4 md:px-6 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-gray-200 bg-gray-50/50 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-sm transition-all">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={(e) => setFiles(e.target.files ?? undefined)}
            disabled={disabled}
          />

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 placeholder:text-gray-400 py-3 px-1"
            rows={1}
            disabled={disabled}
          />

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Mic className="w-5 h-5" />
            </Button>

            <Button
              onClick={() => handleSubmit()}
              disabled={(!input.trim() && !(files?.length ?? 0)) || disabled}
              size="icon"
              className="w-9 h-9 rounded-xl bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40 disabled:bg-gray-300"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {(files?.length ?? 0) > 0 ? (
          <div className="max-w-3xl mx-auto mt-2">
            <div className="text-xs text-gray-500">
              已选择 {files?.length} 个文件
            </div>
          </div>
        ) : null}

        <p className="text-center text-xs text-gray-400 mt-3">
          AI 可能会产生错误。请核实重要信息。
        </p>
      </div>
    </div>
  );
};
