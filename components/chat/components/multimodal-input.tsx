import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Paperclip, ArrowUp } from "lucide-react"; // ArrowUp is more v0-like than Send
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PreviewAttachment, type Attachment } from "./preview-attachment";
import { cn } from "@/lib/utils";

interface MultimodalInputProps {
  onSend: (content: string, attachments: Attachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MultimodalInput = ({
  onSend,
  disabled,
  placeholder = "输入消息...",
}: MultimodalInputProps) => {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<Attachment | undefined> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data: unknown = await response.json();
        if (
          typeof data === "object" &&
          data !== null &&
          "url" in data &&
          "name" in data &&
          "ref" in data &&
          "mediaType" in data
        ) {
          const d = data as {
            url: string;
            name: string;
            ref: string;
            mediaType: string;
            size?: number;
            expiresAt?: number;
          };
          const attachment: Attachment = {
            url: d.url,
            name: d.name,
            ref: d.ref,
            mediaType: d.mediaType,
            size: d.size,
            ...(typeof d.expiresAt === "number" ? { expiresAt: d.expiresAt } : {}),
          };
          return attachment;
        }
        console.error("Upload response shape mismatch:", data);
      } else {
        console.error("Upload failed, response:", response);
      }
    } catch (error) {
      console.error("Error uploading file", error);
    }
  };

  const handleUploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setUploadQueue((prev) => [...prev, ...files.map((f) => f.name)]);

    try {
      const uploadPromises = files.map((file) => uploadFile(file));
      const uploadedAttachments = await Promise.all(uploadPromises);
      const successful: Attachment[] = uploadedAttachments.filter(
        (att): att is Attachment => att !== undefined
      );

      setAttachments((prev) => [...prev, ...successful]);
    } finally {
      setUploadQueue([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    await handleUploadFiles(files);
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData?.files || []);
    if (files.length === 0) return;
    event.preventDefault();
    await handleUploadFiles(files);
  };

  const handleSubmit = () => {
    if (disabled) return;
    const hasText = input.trim().length > 0;
    const hasAttachments = attachments.length > 0;

    if (!hasText && !hasAttachments) return;
    if (uploadQueue.length > 0) return;

    onSend(input, attachments);

    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isUploading = uploadQueue.length > 0;
  const isSendDisabled =
    disabled || isUploading || (!input.trim() && attachments.length === 0);

  return (
    <div className="w-full bg-background px-4 md:px-6 pb-4 pt-2">
      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        {/* Attachments Preview Area - Above input */}
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div className="flex flex-row gap-3 overflow-x-auto py-2">
            {attachments.map((att) => (
              <PreviewAttachment
                key={att.url}
                attachment={att}
                onRemove={() =>
                  setAttachments((prev) => prev.filter((p) => p !== att))
                }
              />
            ))}
            {uploadQueue.map((name, i) => (
              <PreviewAttachment
                key={`${name}-${i}`}
                attachment={{ name, url: "", mediaType: "", ref: "" }}
                isUploading={true}
              />
            ))}
          </div>
        )}

        <div 
          className={cn(
            "relative flex flex-col w-full p-4 bg-white rounded-[26px] transition-all duration-200",
            "border border-black/5 shadow-sm",
            "focus-within:shadow-md focus-within:border-black/10",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="w-full min-h-[72px] max-h-64 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 placeholder:text-gray-400 text-base leading-relaxed"
            rows={1}
            disabled={disabled}
            autoFocus
          />

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSendDisabled}
              size="icon"
              className={cn(
                "w-9 h-9 rounded-full transition-all duration-200",
                isSendDisabled 
                  ? "bg-gray-100 text-gray-300" 
                  : "bg-gray-900 hover:bg-gray-800 text-white shadow-sm"
              )}
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
        </div>

        <p className="text-center text-xs text-gray-400">
          AI 可能会产生错误。请核实重要信息。
        </p>
      </div>
    </div>
  );
};
