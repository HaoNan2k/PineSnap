"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw, X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

interface ArtifactFabProps {
  resourceId: string;
}

export function ArtifactFab({ resourceId }: ArtifactFabProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const generate = trpc.summary.generate.useMutation({
    onSuccess: ({ summaryId }) => {
      router.push(`/summary/${summaryId}`);
    },
    onError: (err) => {
      setError(err.message ?? "生成失败");
    },
  });

  const isPending = generate.isPending;

  return (
    <div className="fixed top-4 right-4 z-50 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            generate.mutate({ resourceId });
          }}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/70 text-white text-sm backdrop-blur-md hover:bg-black/85 disabled:opacity-60 disabled:cursor-wait transition-colors"
          title="再生成一版（耗时约 30 秒）"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCw className="w-4 h-4" />
          )}
          <span>{isPending ? "生成中..." : "再生成一版"}</span>
        </button>
        <button
          type="button"
          onClick={() => router.push("/sources")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/70 text-white text-sm backdrop-blur-md hover:bg-black/85 transition-colors"
          title="回到 Resource 列表"
        >
          <X className="w-4 h-4" />
          <span>回列表</span>
        </button>
      </div>
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/90 text-white text-xs max-w-xs backdrop-blur-md">
          {error}
        </div>
      )}
    </div>
  );
}
