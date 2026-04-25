"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/react";
import { UUID_REGEX, EMAIL_REGEX } from "@/lib/debug/utils";

export function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const search = trpc.debug.searchByQuery.useQuery(
    { q },
    { enabled: false }
  );

  async function submit() {
    setError(null);
    const trimmed = q.trim();
    if (!trimmed) return;

    if (UUID_REGEX.test(trimmed)) {
      router.push(`/debug/learning/${trimmed}`);
      return;
    }

    setPending(true);
    try {
      const res = await search.refetch();
      if (res.data?.type === "learning") {
        router.push(`/debug/learning/${res.data.id}`);
      } else if (res.data?.type === "user") {
        router.push(`/debug/user/${res.data.id}`);
      } else {
        const tried = EMAIL_REGEX.test(trimmed) ? "邮箱" : "未知格式";
        setError(`未找到匹配项（按 ${tried} 解析）`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="输入 learningId (UUID) 或邮箱定位会话"
        className="flex-1 px-3 py-1.5 font-mono text-sm border border-gray-300 rounded bg-white dark:bg-gray-900 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "查询中…" : "搜索"}
      </button>
      {error ? (
        <span className="text-xs text-red-600 font-mono">{error}</span>
      ) : null}
    </div>
  );
}
