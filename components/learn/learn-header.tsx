"use client";

import Link from "next/link";

export function LearnHeader() {
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-sand/20">
      <Link href="/sources" className="flex items-center gap-3 group">
        <div
          className="size-9 text-primary flex items-center justify-center bg-white rounded-xl shadow-sm border border-sand/40 group-hover:bg-sand/10 transition-colors"
        >
          <span className="material-symbols-rounded text-xl icon-filled">
            spa
          </span>
        </div>
        <span className="font-bold text-lg tracking-tight text-primary">
          PineSnap
        </span>
      </Link>
      <div className="flex gap-4 items-center">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sand/40 shadow-sm text-text-secondary">
          <span className="material-symbols-rounded text-orange-500 text-xl icon-filled">
            local_fire_department
          </span>
          <span className="text-sm font-semibold text-text-main">12</span>
        </div>
        <button className="size-9 rounded-full overflow-hidden border border-sand/40 shadow-sm transition-transform hover:scale-105 bg-sand/30 flex items-center justify-center">
          <span className="material-symbols-rounded text-forest-muted">
            person
          </span>
        </button>
      </div>
    </header>
  );
}
