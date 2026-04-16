"use client";

import { trpc } from "@/lib/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function LearningPage() {
  const { data: learnings, isLoading } = trpc.learning.list.useQuery();

  // Find the most recently updated learning with a plan (ready to continue)
  const activeLearning = learnings?.find((l) => l.hasPlan);

  return (
    <div className="flex-1 px-6 py-10 flex flex-col gap-8 max-w-3xl mx-auto w-full">
      {/* Ambient notification card */}
      {activeLearning && (
        <Link
          href={`/learn/${activeLearning.id}`}
          className={cn(
            "group relative rounded-xl p-6 transition-all duration-300",
            "bg-[var(--acorn-glow)] border border-[var(--acorn)]/20",
            "hover:border-[var(--acorn)]/40 hover:shadow-md"
          )}
        >
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-full bg-[var(--acorn)]/10 flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-[var(--acorn)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold tracking-widest uppercase text-[var(--acorn-dark)] mb-1">
                Continue Learning
              </p>
              <h3 className="text-lg font-semibold text-text-main truncate">
                {activeLearning.resources.map((r) => r.title).join(", ")}
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                {activeLearning.conceptsCovered > 0
                  ? `${activeLearning.conceptsCovered} concepts covered`
                  : "Ready to start"}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Header */}
      <header className="flex flex-col gap-1">
        <h2 className="font-serif text-3xl font-semibold text-text-main">
          Learning
        </h2>
        <p className="text-sm text-text-secondary">
          Your learning sessions
        </p>
      </header>

      {/* Learning list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !learnings || learnings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-text-faint">
          <BookOpen className="size-12 opacity-30" />
          <p className="text-base">No learning sessions yet</p>
          <p className="text-sm">Select sources and start a learning session</p>
        </div>
      ) : (
        <div className="space-y-3">
          {learnings.map((learning) => (
            <Link
              key={learning.id}
              href={`/learn/${learning.id}`}
              className={cn(
                "block rounded-xl border border-border-light p-4 transition-all",
                "hover:border-forest/30 hover:bg-forest/[0.02]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-forest/10 flex items-center justify-center shrink-0">
                  <BookOpen className="size-4 text-forest" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text-main truncate">
                    {learning.resources.map((r) => r.title).join(", ")}
                  </h4>
                  <p className="text-xs text-text-faint mt-0.5">
                    {learning.hasPlan ? "Has plan" : "Needs clarification"}
                    {learning.conceptsCovered > 0 &&
                      ` · ${learning.conceptsCovered} concepts`}
                    {" · "}
                    {formatRelativeTime(learning.updatedAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
