import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/server/context";
import { SearchBar } from "@/components/debug/search-bar";

export default async function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/login?returnUrl=%2Fdebug");
  }
  const role = await resolveUserRole(supabase);
  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100 mb-2">
            403 — Admin only
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
            当前账号 ({data.user.email}) 没有 admin 权限。
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 font-mono mt-4">
            如何获取见 docs/platform/admin-role-setup.md
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur px-4 py-2 flex items-center gap-4">
        <a
          href="/debug"
          className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600"
        >
          /debug
        </a>
        <div className="flex-1 max-w-2xl">
          <SearchBar />
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {data.user.email}
        </span>
      </header>
      <main>{children}</main>
    </div>
  );
}
