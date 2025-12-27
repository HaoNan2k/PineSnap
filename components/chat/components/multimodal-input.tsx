import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PreviewAttachment, type Attachment } from "./preview-attachment";

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

    // Add filenames to queue to show loading state
    setUploadQueue((prev) => [...prev, ...files.map((f) => f.name)]);

    try {
      const uploadPromises = files.map((file) => uploadFile(file));
      const uploadedAttachments = await Promise.all(uploadPromises);
      const successful: Attachment[] = uploadedAttachments.filter(
        (att): att is Attachment => att !== undefined
      );

      setAttachments((prev) => [...prev, ...successful]);
    } finally {
      // Clear queue (simple implementation: assumes all finished)
      // A more robust implementation would track individual file status
      setUploadQueue([]);
      // Reset input so change event triggers again for same file
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

    // Prevent send if still uploading
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
    <div className="border-t border-gray-100 bg-white px-4 md:px-6 py-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Attachments Preview Area */}
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div className="flex flex-row gap-2 overflow-x-auto pb-2">
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

        <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-gray-200 bg-gray-50/50 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-sm transition-all">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            className="flex-1 min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-900 placeholder:text-gray-400 py-3 px-1"
            rows={1}
            disabled={disabled}
          />

          <Button
            onClick={handleSubmit}
            disabled={isSendDisabled}
            size="icon"
            className="w-9 h-9 rounded-xl bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40 disabled:bg-gray-300 flex-shrink-0 mb-1"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400">
          AI 可能会产生错误。请核实重要信息。
        </p>
      </div>
    </div>
  );
};
