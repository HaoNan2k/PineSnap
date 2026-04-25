"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Loader2, Sparkles } from "lucide-react";

import { trpc } from "@/lib/trpc/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SummaryDrawerProps {
  resourceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SummaryDrawer({ resourceId, open, onOpenChange }: SummaryDrawerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const list = trpc.summary.listByResource.useQuery(
    { resourceId: resourceId ?? "" },
    { enabled: !!resourceId && open }
  );

  const generate = trpc.summary.generate.useMutation({
    onSuccess: ({ summaryId }) => {
      onOpenChange(false);
      router.push(`/summary/${summaryId}`);
    },
    onError: (err) => {
      setError(err.message ?? "生成失败，请稍后重试");
    },
  });

  const variants = list.data ?? [];
  const isPending = generate.isPending;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-serif">
            <Sparkles className="w-5 h-5 text-primary" />
            探索版
          </SheetTitle>
          <SheetDescription>
            让 AI 给这个素材量身做一份漂亮的可玩 artifact。每次生成都不一样，可以多生成几版对比。
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 flex flex-col gap-4 flex-1 overflow-auto">
          <button
            type="button"
            onClick={() => {
              if (!resourceId) return;
              setError(null);
              generate.mutate({ resourceId });
            }}
            disabled={!resourceId || isPending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-60 disabled:cursor-wait hover:bg-primary/90 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>生成中（30~60 秒）...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>+ 生成一版</span>
              </>
            )}
          </button>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          {list.isLoading && resourceId && open && (
            <div className="flex items-center justify-center py-8 text-forest-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {variants.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-forest-muted">
                历史
              </h3>
              <div className="flex flex-col gap-2">
                {[...variants].reverse().map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/summary/${variant.id}`);
                    }}
                    className="text-left px-3 py-2.5 rounded-lg border border-sand/40 hover:border-primary/40 hover:bg-sand/10 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium text-primary">v{variant.index}</span>
                      <span className="text-xs text-forest-muted truncate">
                        {variant.model}
                      </span>
                    </div>
                    <span className="text-xs text-forest-muted shrink-0">
                      {formatDistanceToNow(new Date(variant.generatedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
