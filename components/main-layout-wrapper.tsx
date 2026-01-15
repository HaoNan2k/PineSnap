"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/sources", label: "素材", icon: "inbox" },
  { href: "/learning", label: "学习", icon: "school" },
  { href: "/notes", label: "知识", icon: "auto_stories" },
];

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <MainSidebar />
      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}

function MainSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 flex flex-col justify-between bg-background-light dark:bg-background-dark p-8">
      <div className="flex flex-col gap-10">
        {/* Brand */}
        <Link href="/sources" className="flex items-center gap-3">
          <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white">
            <span className="material-symbols-rounded text-2xl">filter_hdr</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-primary dark:text-white text-lg font-bold leading-none">
              PineSnap
            </h1>
            <p className="text-forest-muted text-[11px] font-medium tracking-[0.08em] mt-1">
              不止收藏
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-primary dark:text-white"
                    : "text-forest-muted hover:bg-sand/10"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-rounded text-2xl",
                    isActive && "icon-filled"
                  )}
                >
                  {item.icon}
                </span>
                <span
                  className={cn("text-sm", isActive ? "font-bold" : "font-medium")}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-disabled="true"
          className="flex items-center gap-4 px-4 py-3 rounded-xl text-forest-muted transition-colors cursor-not-allowed opacity-60"
        >
          <span className="material-symbols-rounded text-xl">settings</span>
          <span className="text-sm font-medium">设置</span>
        </button>

        {/* User Profile */}
        <div className="mt-4 px-4 flex items-center gap-3">
          <div className="size-8 rounded-full bg-sand/30 flex items-center justify-center">
            <span className="material-symbols-rounded text-sm text-forest-muted">
              person
            </span>
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-bold">访客用户</p>
            <p className="text-[10px] text-forest-muted italic">v1.0.4</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
