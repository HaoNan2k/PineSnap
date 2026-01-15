"use client";

import { trpc } from "@/lib/trpc/react";
import type { AppRouter } from "@/server";
import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ResourceList = RouterOutputs["resource"]["list"];

export function SourceList() {
  const { data, isLoading } = trpc.resource.list.useQuery();
  const resources: ResourceList = data ?? [];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="material-symbols-rounded text-4xl animate-spin text-forest-muted">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 px-12 py-12 flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-5xl font-normal text-primary dark:text-white">
            素材
          </h2>
          <p className="text-forest-muted font-sans text-sm tracking-wide">
            {resources?.length
              ? `你有 ${resources.length} 条素材等待处理`
              : "暂无素材，去采集一些内容吧"}
          </p>
        </div>
        {resources?.length ? (
          <div className="flex items-center gap-4">
            <button className="text-forest-muted hover:text-primary text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-sand/10 transition-colors">
              <span className="material-symbols-rounded text-xl">sort</span>
              按日期排序
            </button>
          </div>
        ) : null}
      </header>

      {!resources?.length ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-forest-muted">
          <span className="material-symbols-rounded text-6xl opacity-30">
            source
          </span>
          <p className="text-lg">暂无素材</p>
          <p className="text-sm">从各处采集的内容都会汇聚在这里</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {resources.map((resource: ResourceList[number]) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>

          <div className="mt-8 flex justify-center pb-8">
            <p className="text-forest-muted text-xs font-medium uppercase tracking-widest opacity-60">
              — 到底了 —
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function ResourceCard({
  resource,
}: {
  resource: {
    id: string;
    type: string;
    title: string;
    externalId: string | null;
    createdAt: Date;
  };
}) {
  const sourceLabel = getSourceLabel(resource.type);
  const dateFormatted = format(new Date(resource.createdAt), "M月d日", {
    locale: zhCN,
  });
  const typeLabel = getTypeLabel(resource.type);
  const typeIcon = getTypeIcon(resource.type);

  return (
    <div className="group flex items-center gap-6 p-4 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 hover:border-sand transition-all shadow-sm hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative size-20 shrink-0 rounded-xl border border-sand/40 bg-sand/10 flex items-center justify-center">
        <span className="material-symbols-rounded text-3xl text-primary">
          {typeIcon}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="bg-sand/20 text-primary dark:text-sand text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
            来自 {sourceLabel}
          </span>
          <span className="text-[11px] text-forest-muted">
            采集于 {dateFormatted}
          </span>
        </div>
        <h3 className="font-serif text-lg text-[#131614] dark:text-white font-medium truncate">
          {resource.title}
        </h3>
        <p className="text-sm text-forest-muted truncate mt-0.5">
          {typeLabel}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
        <button className="px-5 py-2.5 rounded-xl border border-sand/50 text-forest-muted hover:bg-sand/10 hover:text-primary transition-colors text-sm font-medium">
          丢弃
        </button>
        <Link
          href={`/learn/${resource.id}`}
          className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-rounded text-lg">play_arrow</span>
          开始
        </Link>
      </div>
    </div>
  );
}

function getSourceLabel(type: string): string {
  const labels: Record<string, string> = {
    bilibili_capture: "B站",
    web_capture: "网页",
    youtube_capture: "YouTube",
  };
  return labels[type] ?? "其他";
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bilibili_capture: "视频素材",
    web_capture: "网页素材",
    youtube_capture: "视频素材",
  };
  return labels[type] ?? "素材";
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    bilibili_capture: "smart_display",
    web_capture: "language",
    youtube_capture: "smart_display",
  };
  return icons[type] ?? "note_stack";
}
