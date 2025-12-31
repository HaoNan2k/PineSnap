import { Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useMemo } from "react";

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
  const { name, url: initialUrl, mediaType, ref } = attachment;
  const isImage = mediaType?.startsWith("image/");

  const initialData = useMemo(() => {
    if (!initialUrl) return undefined;
    // We don't compute expiresAt on the client to keep render pure.
    // Expiry handling is driven by `staleTime` + `img.onError -> refetch()`.
    return { url: initialUrl, expiresAt: 0 };
  }, [initialUrl]);

  // 使用 React Query (via trpc) 管理 URL 获取
  // 仅当 ref 存在且没有初始 URL 时启用
  const { data, refetch } = trpc.files.getUrl.useQuery(
    { ref },
    {
      enabled: !!ref && !initialUrl && !isUploading,
      initialData,
      // TTL 是 300s：把 staleTime 设为略小于 TTL，避免“刚过期就命中缓存”
      staleTime: 1000 * 60 * 4,
      // 即使组件卸载，缓存也保留 1 小时
      gcTime: 1000 * 60 * 60,
      // 失败重试 1 次
      retry: 1,
    }
  );

  const resolvedUrl = data?.url;

  return (
    <div className="relative flex flex-col gap-2 p-1 rounded-xl border border-gray-100 bg-gray-50/50 w-24 h-24 flex-shrink-0 group overflow-hidden">
      {/* 
        SSR/CSR 一致性：
        - 如果没有可用 URL，就始终渲染占位（不渲染 <img>）
        - 有 URL 再渲染 <img>
      */}
      {isUploading || !resolvedUrl ? (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedUrl || undefined} // Avoid empty string warning
          alt={name ?? "Attachment"}
          className="w-full h-full object-cover rounded-lg"
          onError={() => {
             // 如果图片加载失败（可能是 URL 过期），尝试刷新一次
             // React Query 的 refetch 会忽略 staleTime 强制请求
             refetch();
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg text-[10px] text-gray-500 break-all p-2 text-center gap-1">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            <span className="uppercase font-bold tracking-wider">{name.split('.').pop()?.slice(0, 4) || 'FILE'}</span>
          </div>
          <span className="line-clamp-1 w-full">{name}</span>
        </div>
      )}

      {onRemove && !isUploading && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
