"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user/user-menu";
import { BookOpenText, GraduationCap, Inbox } from "lucide-react";

const navItems = [
  { href: "/sources", label: "素材", Icon: Inbox },
  { href: "/learning", label: "学习", Icon: GraduationCap },
  { href: "/notes", label: "知识", Icon: BookOpenText },
];

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <MainSidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">{children}</main>
      <MobileBottomNav />
    </div>
  );
}

function MainSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-72 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-0 flex-col justify-between bg-background-light dark:bg-background-dark p-8">
      <div className="flex flex-col gap-10">
        {/* Brand */}
        <Link href="/sources" className="flex items-center gap-3">
          <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white">
            <Image
              src="/brand-icon.svg"
              alt="PineSnap"
              className="h-6 w-6 invert"
              width={24}
              height={24}
              draggable={false}
            />
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
            const Icon = item.Icon;
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
                <Icon className="h-6 w-6" aria-hidden />
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
        <UserMenu variant="sidebar" loginHref="/sources" />
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-forest-muted"
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
