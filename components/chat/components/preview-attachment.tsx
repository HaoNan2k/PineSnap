import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Attachment {
  name: string;
  mediaType: string;
  url: string;
  ref: string; // Internal ref
  size?: number;
  expiresAt?: number;
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
  const { name, url, mediaType, ref, expiresAt } = attachment;

  const [resolvedUrl, setResolvedUrl] = useState<string>(url);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    setResolvedUrl(url);
  }, [url]);

  const shouldAutoRefresh = useMemo(() => {
    if (!ref) return false;
    if (!mediaType?.startsWith("image/")) return false;
    return true;
  }, [mediaType, ref]);

  const refreshSignedUrl = useCallback(async () => {
    if (!ref) return;
    if (refreshInFlight.current) return refreshInFlight.current;

    const task = (async () => {
      try {
        const res = await fetch(`/api/files/url?ref=${encodeURIComponent(ref)}`);
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (
          typeof data === "object" &&
          data !== null &&
          "url" in data &&
          typeof (data as { url?: unknown }).url === "string"
        ) {
          setResolvedUrl((data as { url: string }).url);
        }
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = task;
    return task;
  }, [ref]);

  useEffect(() => {
    if (!shouldAutoRefresh || isUploading) return;
    if (!expiresAt || !Number.isFinite(expiresAt)) return;

    const now = Date.now();
    // Refresh a bit before expiry to keep it "user-unaware".
    const refreshAt = Math.max(now + 1000, expiresAt - 10_000);
    const delay = refreshAt - now;

    const t = window.setTimeout(() => {
      void refreshSignedUrl();
    }, delay);

    return () => window.clearTimeout(t);
  }, [expiresAt, isUploading, refreshSignedUrl, shouldAutoRefresh]);

  return (
    <div className="relative flex flex-col gap-2 p-2 rounded-xl border bg-gray-50 w-24 h-24 flex-shrink-0 group">
      {isUploading ? (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : mediaType?.startsWith("image/") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedUrl}
          alt={name ?? "Attachment"}
          className="w-full h-full object-cover rounded-lg"
          onError={() => {
            if (!shouldAutoRefresh) return;
            void refreshSignedUrl();
          }}
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


