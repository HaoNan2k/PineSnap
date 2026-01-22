import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Github, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "法律条款 - PineSnap",
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-sans text-stone-800 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-stone-100 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2 font-medium opacity-90 hover:opacity-100 transition-opacity">
            <div className="relative h-6 w-6">
              <Image 
                src="/brand-icon.svg" 
                alt="PineSnap Logo" 
                fill
                className="object-contain"
              />
            </div>
            <span className="font-serif tracking-tight text-lg">PineSnap</span>
          </Link>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex-1 container mx-auto px-4 md:px-8 py-12">
        <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
          
          {/* Sidebar */}
          <aside className="hidden md:block w-48 shrink-0">
            <div className="sticky top-28 space-y-6">
              <nav className="flex flex-col space-y-1 text-sm font-medium text-stone-600">
                <Link 
                  href="/terms" 
                  className="hover:text-stone-900 hover:bg-stone-100 px-3 py-2 rounded-md transition-all block"
                >
                  服务条款
                </Link>
                <Link 
                  href="/privacy" 
                  className="hover:text-stone-900 hover:bg-stone-100 px-3 py-2 rounded-md transition-all block"
                >
                  隐私政策
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-3xl min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-100 py-12 mt-auto bg-stone-50">
        <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-stone-500">
                    © 2026 PineSnap Inc. All rights reserved.
                </div>
                <div className="flex items-center gap-6">
                    <a 
                        href="https://github.com/HaoNan2k/PineSnap" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-stone-400 hover:text-stone-900 transition-colors"
                        aria-label="GitHub"
                    >
                        <Github className="h-5 w-5" />
                    </a>
                    <a 
                        href="mailto:hi@pinesnap.com" 
                        className="text-stone-400 hover:text-stone-900 transition-colors"
                        aria-label="Email"
                    >
                        <Mail className="h-5 w-5" />
                    </a>
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
