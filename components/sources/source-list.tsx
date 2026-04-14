"use client";

import { trpc, getTrpcErrorCode } from "@/lib/trpc/react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  Globe,
  Inbox,
  Layers,
  Loader2,
  MessageSquare,
  Video,
  Youtube,
} from "lucide-react";

type SourceListItem = {
  id: string;
  sourceType: string;
  title: string;
  canonicalUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string | Date;
  activeJob?: { status?: string } | null;
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  bilibili: Video,
  web_page: Globe,
  wechat_article: MessageSquare,
  youtube: Youtube,
  xiaohongshu: Globe,
};

export function SourceList() {
  const router = useRouter();
  const { data, isLoading, error } = trpc.resource.list.useQuery();
  const resources = useMemo(() => (data ?? []) as unknown as SourceListItem[], [data]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedCount = selectedIds.length;
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const createLearning = trpc.learning.create.useMutation({
    onSuccess: (payload) => {
      router.push(`/learn/${payload.id}`);
    },
  });

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const startLearning = async (resourceIds: string[]) => {
    if (resourceIds.length === 0 || createLearning.isPending) return;
    await createLearning.mutateAsync({ resourceIds });
  };

  const hasResources = resources.length > 0;
  const isAllSelected = hasResources && selectedCount === resources.length;

  const sortedResources = useMemo(() => {
    const items = resources.slice();
    items.sort((a, b) => {
      const aTs = new Date(a.createdAt).getTime();
      const bTs = new Date(b.createdAt).getTime();
      return sortDirection === "desc" ? bTs - aTs : aTs - bTs;
    });
    return items;
  }, [resources, sortDirection]);

  const toggleSelectAll = () => {
    setSelectedIds(
      isAllSelected ? [] : resources.map((resource) => resource.id)
    );
  };

  if (error) {
    if (getTrpcErrorCode(error) === "UNAUTHORIZED") {
      return null;
    }
    console.error("[SourceList] Failed to load resources:", error);
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-forest-muted opacity-30 mx-auto" aria-hidden />
          <p className="text-sm text-forest-muted">暂时无法加载，请稍后重试</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-12 py-12 flex flex-col gap-8">
      <header className="-mx-12 px-12 py-6 sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-5xl font-normal text-primary dark:text-white">
            素材
          </h2>
          <p className="text-forest-muted font-sans text-sm tracking-wide">
            {isLoading
              ? "正在加载素材..."
              : hasResources
              ? `你有 ${resources.length} 条素材等待处理`
              : "暂无素材，去采集一些内容吧"}
          </p>
        </div>
        {hasResources && !isLoading ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-4 py-2 rounded-xl border border-sand/50 text-forest-muted hover:bg-sand/10 hover:text-primary transition-colors text-sm font-medium"
            >
              {isAllSelected ? "取消全选" : "全选"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedCount === 0}
              className="px-4 py-2 rounded-xl border border-sand/50 text-forest-muted hover:bg-sand/10 hover:text-primary transition-colors text-sm font-medium disabled:opacity-50"
            >
              清空选择
            </button>
            <button
              type="button"
              onClick={() => startLearning(selectedIds)}
              disabled={selectedCount === 0 || createLearning.isPending}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              创建学习
              {selectedCount > 0 ? `（已选 ${selectedCount}）` : ""}
            </button>
            <button
              type="button"
              onClick={() =>
                setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
              }
              className="text-forest-muted hover:text-primary text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-sand/10 transition-colors"
            >
              <ArrowUpDown className="h-5 w-5" aria-hidden />
              按日期：{sortDirection === "desc" ? "最新" : "最早"}
            </button>
          </div>
        ) : null}
        </div>
      </header>

      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-forest-muted" aria-hidden />
        </div>
      ) : !hasResources ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-forest-muted">
          <Inbox className="h-16 w-16 opacity-30" aria-hidden />
          <p className="text-lg">暂无素材</p>
          <p className="text-sm">从各处采集的内容都会汇聚在这里</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                selected={selectedSet.has(resource.id)}
                onToggleSelected={toggleSelected}
                disabled={createLearning.isPending}
              />
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
  selected,
  onToggleSelected,
  disabled,
}: {
  resource: SourceListItem;
  selected: boolean;
  onToggleSelected: (id: string) => void;
  disabled: boolean;
}) {
  const sourceLabel = getSourceLabel(resource.sourceType);
  const dateFormatted = format(new Date(resource.createdAt), "M月d日", {
    locale: zhCN,
  });
  const typeLabel = getTypeLabel(resource.sourceType);
  const TypeIcon = TYPE_ICONS[resource.sourceType] ?? Layers;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggleSelected(resource.id)}
      aria-pressed={selected}
      className={[
        "group relative flex flex-col gap-4 border p-4 rounded-2xl transition-all text-left",
        "bg-white dark:bg-card shadow-sm hover:shadow-md",
        selected
          ? "border-primary/60 ring-2 ring-primary/15"
          : "border-gray-100 dark:border-gray-800 hover:border-sand",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <div className="relative w-full aspect-[4/3] rounded-xl border border-sand/40 bg-sand/10 flex items-center justify-center overflow-hidden">
        {resource.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resource.thumbnailUrl}
            alt={resource.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <TypeIcon className="h-9 w-9 text-primary" aria-hidden />
        )}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {selected ? (
            <span className="inline-flex items-center justify-center size-7 rounded-full bg-primary text-white shadow-sm">
              <Check className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(resource.id)}
            onClick={(event) => event.stopPropagation()}
            className="size-4 accent-primary"
            aria-label="选择素材"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className="bg-sand/20 text-primary dark:text-sand text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
            来自 {sourceLabel}
          </span>
          <span className="text-[11px] text-forest-muted shrink-0">
            {dateFormatted}
          </span>
        </div>
        <h3 className="font-serif text-lg text-[#131614] dark:text-white font-medium line-clamp-2">
          {resource.title}
        </h3>
        <p className="text-sm text-forest-muted truncate">
          {typeLabel}
        </p>
        <p className="text-xs text-forest-muted/80 truncate">
          {resource.canonicalUrl}
        </p>
        <p className="text-xs text-forest-muted/90 truncate">
          {getStatusLabel(resource.activeJob?.status)}
        </p>
      </div>
    </button>
  );
}

function getSourceLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    bilibili: "B站",
    wechat_article: "公众号",
    web_page: "网页",
    youtube: "YouTube",
    xiaohongshu: "小红书",
  };
  return labels[sourceType] ?? "其他";
}

function getTypeLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    bilibili: "视频素材",
    wechat_article: "文章素材",
    web_page: "网页素材",
    youtube: "视频素材",
    xiaohongshu: "图文素材",
  };
  return labels[sourceType] ?? "素材";
}

function getStatusLabel(status?: string): string {
  if (!status) return "未开始处理";
  if (status === "PENDING") return "排队中";
  if (status === "RUNNING") return "处理中";
  if (status === "SUCCEEDED") return "已完成";
  if (status === "FAILED") return "处理失败";
  if (status === "CANCELLED") return "已取消";
  return "状态未知";
}
