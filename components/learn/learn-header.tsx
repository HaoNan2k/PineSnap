"use client";

import Link from "next/link";
import Image from "next/image";
import { Flame, User } from "lucide-react";

export function LearnHeader() {
  return (
    <header className="w-full px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-sand/20">
      <Link href="/sources" className="flex items-center gap-3 group">
        <div
          className="size-9 text-primary flex items-center justify-center bg-white rounded-xl shadow-sm border border-sand/40 group-hover:bg-sand/10 transition-colors"
        >
          <Image
            src="/brand-icon.svg"
            alt="PineSnap"
            className="h-5 w-5"
            width={20}
            height={20}
            draggable={false}
          />
        </div>
        <span className="font-bold text-lg tracking-tight text-primary">
          PineSnap
        </span>
      </Link>
      <div className="flex gap-4 items-center">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-sand/40 shadow-sm text-text-secondary">
          <Flame className="h-5 w-5 text-orange-500" aria-hidden />
          <span className="text-sm font-semibold text-text-main">12</span>
        </div>
        <button className="size-9 rounded-full overflow-hidden border border-sand/40 shadow-sm transition-transform hover:scale-105 bg-sand/30 flex items-center justify-center">
          <User className="h-5 w-5 text-forest-muted" aria-hidden />
        </button>
      </div>
    </header>
  );
}
