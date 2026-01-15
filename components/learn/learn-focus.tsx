"use client";

import { useState } from "react";
import Link from "next/link";

interface LearnFocusProps {
  resource: {
    id: string;
    title: string;
    type: string;
    content: unknown;
  };
}

type LearnState = "idle" | "generating" | "active";

interface Card {
  id: string;
  type: string;
  title: string;
  prompt: string;
}

export function LearnFocus({ resource }: LearnFocusProps) {
  const [status, setStatus] = useState<LearnState>("idle");
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setStatus("generating");
    setError(null);

    try {
      const res = await fetch("/api/learn/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: resource.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate card");
      }

      const data = await res.json();
      if (data.ok && data.card) {
        setCard(data.card);
        setStatus("active");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatus("idle");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full relative bg-background">
      {/* Exit Button - Top Left */}
      <div className="fixed top-20 left-6 z-10">
        <Link
          href="/sources"
          className="text-text-secondary/60 hover:text-primary transition-all flex items-center justify-center rounded-xl w-10 h-10 hover:bg-sand/20 border border-transparent hover:border-sand/40 group"
          title="返回素材"
        >
          <span className="material-symbols-rounded text-3xl">close</span>
        </Link>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        {status === "idle" && (
          <IdleState
            resource={resource}
            error={error}
            onStart={handleStart}
          />
        )}

        {status === "generating" && <GeneratingState />}

        {status === "active" && card && (
          <ActiveState card={card} onReset={() => { setStatus("idle"); setCard(null); }} />
        )}

      </main>
    </div>
  );
}

function IdleState({
  resource,
  error,
  onStart,
}: {
  resource: { title: string; type: string };
  error: string | null;
  onStart: () => void;
}) {
  return (
    <div className="w-full max-w-[600px] bg-card rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10 relative overflow-hidden">
      {/* Context Badge */}
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center gap-2 text-primary/80 uppercase tracking-widest text-xs font-bold font-sans">
          <span className="material-symbols-rounded text-sm">eco</span>
          <span>LEARNING</span>
        </div>
        <div className="relative pl-4 border-l-2 border-sand/50">
          <p className="font-serif italic text-text-secondary text-lg leading-relaxed">
           慢慢学习，慢慢积累。
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="mb-8">
        <span className="text-[10px] font-bold text-forest-muted uppercase tracking-wider bg-sand/20 px-2 py-1 rounded mb-3 inline-block">
          {resource.type.replace("_", " ")}
        </span>
        <h1 className="font-serif text-2xl font-bold leading-snug text-text-main">
          {resource.title}
        </h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-10 flex items-center justify-center pt-6 border-t border-gray-100">
        <button
          onClick={onStart}
          className="flex items-center justify-center h-10 px-8 bg-primary text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-primary/20 hover:bg-primary/90 gap-2"
        >
          <span className="material-symbols-rounded text-lg">spa</span>
          开始学习
        </button>
      </div>
    </div>
  );
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <span className="material-symbols-rounded text-5xl animate-spin text-primary relative z-10">
          progress_activity
        </span>
      </div>
      <p className="text-lg text-forest-muted font-medium animate-pulse">
        正在生成学习内容...
      </p>
    </div>
  );
}

function ActiveState({ card, onReset }: { card: Card; onReset: () => void }) {
  return (
    <div className="w-full max-w-[600px] bg-card rounded-3xl shadow-xl border border-sand/20 overflow-hidden">
      {/* Success Header */}
      <div className="feedback-gradient p-8 sm:p-10 pb-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-success/10 text-success flex items-center justify-center">
            <span className="material-symbols-rounded icon-filled">
              check_circle
            </span>
          </div>
          <span className="text-success font-bold uppercase tracking-widest text-sm font-sans">
            {card.title}
          </span>
        </div>
        <div className="mb-8">
          <h1 className="font-serif text-2xl font-bold leading-snug text-text-main">
            学习挑战
          </h1>
        </div>
      </div>

      {/* Card Content */}
      <div className="px-8 sm:px-10 pt-2 pb-8">
        <div className="bg-background/50 rounded-2xl p-6 border border-sand/30 font-sans mb-8">
          <h3 className="text-primary font-bold text-xs uppercase tracking-wider mb-3">
            思考引导
          </h3>
          <pre className="text-text-secondary leading-relaxed text-base whitespace-pre-wrap font-sans">
            {card.prompt}
          </pre>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-sand/20">
          <button className="flex items-center gap-2 text-text-secondary hover:text-primary font-semibold text-sm transition-colors px-2 py-2 rounded-lg group">
            <span className="material-symbols-rounded text-xl group-hover:scale-110 transition-transform">
              share
            </span>
            <span>分享</span>
          </button>
          <button
            onClick={onReset}
            className="w-full sm:w-auto flex items-center justify-center h-12 px-8 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary/10 active:scale-[0.98]"
          >
            继续学习
          </button>
        </div>
      </div>
    </div>
  );
}
