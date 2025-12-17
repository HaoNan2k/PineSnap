import { Loader2, X } from "lucide-react";

export interface Attachment {
  name: string;
  mediaType: string;
  url: string;
  ref: string; // Internal ref
  size?: number;
}

interface PreviewAttachmentProps {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}

export const PreviewAttachment = ({
  attachment,
  isUploading,
  onRemove,
}: PreviewAttachmentProps) => {
  const { name, url, mediaType } = attachment;

  return (
    <div className="relative flex flex-col gap-2 p-2 rounded-xl border bg-gray-50 w-24 h-24 flex-shrink-0 group">
      {isUploading ? (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : mediaType?.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name ?? "Attachment"}
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg text-xs text-gray-500 break-all p-1 text-center">
          {name}
        </div>
      )}

      {onRemove && !isUploading && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="absolute -top-2 -right-2 bg-gray-200 hover:bg-gray-300 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3 text-gray-600" />
        </button>
      )}
    </div>
  );
};

