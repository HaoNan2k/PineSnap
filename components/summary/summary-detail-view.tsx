"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ArrowLeft, Loader2, RotateCw, Sparkles } from "lucide-react";

import { trpc } from "@/lib/trpc/react";
import { KeyMomentSchema, type KeyMoment } from "@/lib/summary/schema";
import { SummaryDocument } from "@/components/summary/summary-document";
import { KeyMoments } from "@/components/summary/key-moments";

interface InitialSummary {
  markdown: string;
  oneLineSummary: string;
  keyMoments: unknown;
}

interface SummaryDetailViewProps {
  resourceId: string;
  title: string;
  sourceType: string;
  canonicalUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  initialSummary: InitialSummary | null;
}

export function SummaryDetailView({
  resourceId,
  title,
  sourceType,
  canonicalUrl,
  thumbnailUrl,
  createdAt,
  initialSummary,
}: SummaryDetailViewProps) {
  const [error, setError] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);
  const utils = trpc.useUtils();

  const summaryQuery = trpc.summary.getByResourceId.useQuery(
    { resourceId },
    { enabled: !initialSummary }
  );

  const generate = trpc.summary.generate.useMutation({
    onSuccess: () => {
      utils.summary.getByResourceId.invalidate({ resourceId });
      utils.resource.list.invalidate();
    },
    onError: (err) => {
      setError(err.message ?? "生成失败，请稍后重试");
    },
  });

  const queryData = summaryQuery.data as
    | { markdown: string; oneLineSummary: string; keyMoments: unknown }
    | null
    | undefined;
  const summary: InitialSummary | null = useMemo(() => {
    if (queryData) {
      return {
        markdown: queryData.markdown,
        oneLineSummary: queryData.oneLineSummary,
        keyMoments: queryData.keyMoments,
      };
    }
    return initialSummary;
  }, [queryData, initialSummary]);

  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (summary) return;
    if (generate.isPending) return;
    if (summaryQuery.isLoading) return;
    autoTriggeredRef.current = true;
    generate.mutate({ resourceId });
  }, [resourceId, summary, generate, summaryQuery.isLoading]);

  const isGenerating = generate.isPending;
  const dateLabel = format(new Date(createdAt), "yyyy年M月d日", { locale: zhCN });
  const sourceLabel = getSourceLabel(sourceType);
  const moments = parseKeyMoments(summary?.keyMoments);

  return (
    <article className="flex-1 min-w-0">
      <header className="px-12 pt-8 pb-2">
        <Link
          href="/sources"
          className="inline-flex items-center gap-1.5 text-sm text-forest-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          <span>素材</span>
        </Link>
      </header>

      <div className="px-12 pb-16 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-3 text-xs text-forest-muted uppercase tracking-wider">
          <span className="font-semibold">{sourceLabel}</span>
          <span>·</span>
          <span>{dateLabel}</span>
        </div>

        <h1 className="font-serif text-4xl text-primary dark:text-white font-medium leading-tight mb-4">
          {title}
        </h1>

        {summary?.oneLineSummary ? (
          <p className="text-lg text-forest-muted leading-relaxed mb-6">
            {summary.oneLineSummary}
          </p>
        ) : null}

        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-acorn-dark dark:text-acorn-light hover:underline mb-8"
        >
          打开原素材 ↗
        </a>

        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full rounded-2xl border border-sand/30 mb-10 aspect-video object-cover"
          />
        ) : null}

        <hr className="border-sand/30 mb-10" />

        {summary ? (
          <>
            <SummaryDocument markdown={summary.markdown} />
            <KeyMoments
              moments={moments}
              sourceType={sourceType}
              canonicalUrl={canonicalUrl}
            />
            <div className="mt-16 pt-6 border-t border-sand/30 flex items-center justify-between gap-4">
              <p className="text-xs text-forest-muted">
                由 AI 根据素材自动生成，可能包含偏差，请以原素材为准。
              </p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  generate.mutate({ resourceId });
                }}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-sand/50 text-sm text-forest-muted hover:text-primary hover:bg-sand/10 transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" aria-hidden />
                    <span>重新生成</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : isGenerating ? (
          <SummarySkeleton />
        ) : error ? (
          <div className="flex flex-col gap-4 items-start py-12">
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-900">
              {error}
            </div>
            <button
              type="button"
              onClick={() => {
                setError(null);
                generate.mutate({ resourceId });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="w-4 h-4" aria-hidden />
              <span>重试生成</span>
            </button>
          </div>
        ) : (
          <SummarySkeleton />
        )}
      </div>
    </article>
  );
}

function SummarySkeleton() {
  return (
    <div className="flex flex-col gap-6 py-8" aria-busy="true" aria-label="正在生成总结">
      <div className="flex items-center gap-2 text-forest-muted">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        <span className="text-sm">正在为你生成总结，约 30~60 秒...</span>
      </div>
      <div className="flex flex-col gap-3 mt-4">
        <div className="h-6 w-32 bg-sand/30 rounded animate-pulse" />
        <div className="h-4 w-full bg-sand/20 rounded animate-pulse" />
        <div className="h-4 w-[92%] bg-sand/20 rounded animate-pulse" />
        <div className="h-4 w-[85%] bg-sand/20 rounded animate-pulse" />
      </div>
      <div className="flex flex-col gap-3 mt-6">
        <div className="h-6 w-24 bg-sand/30 rounded animate-pulse" />
        <div className="h-4 w-[78%] bg-sand/20 rounded animate-pulse" />
        <div className="h-4 w-[82%] bg-sand/20 rounded animate-pulse" />
        <div className="h-4 w-[70%] bg-sand/20 rounded animate-pulse" />
      </div>
    </div>
  );
}

function parseKeyMoments(value: unknown): KeyMoment[] {
  if (!Array.isArray(value)) return [];
  const moments: KeyMoment[] = [];
  for (const item of value) {
    const parsed = KeyMomentSchema.safeParse(item);
    if (parsed.success) moments.push(parsed.data);
  }
  return moments;
}

function getSourceLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    bilibili: "B 站",
    wechat_article: "公众号",
    web_page: "网页",
    youtube: "YouTube",
    xiaohongshu: "小红书",
  };
  return labels[sourceType] ?? "其他";
}
