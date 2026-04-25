"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc/react";
import { Copyable } from "@/components/debug/copyable";
import { LearningList } from "@/components/debug/learning-list";

export default function UserDebugPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { data, error, isLoading } = trpc.debug.listLearningsByUser.useQuery({
    userId,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-6 font-mono text-sm text-gray-500">loading…</div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 font-mono text-sm">
        <div className="border border-red-300 bg-red-50 text-red-900 rounded p-3 whitespace-pre-wrap">
          {error.message}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="px-4 py-4 space-y-4">
      <header className="border border-gray-200 dark:border-gray-800 rounded bg-gray-50 dark:bg-gray-900 p-3 font-mono text-[12px] flex items-center gap-4 flex-wrap">
        <span className="text-[11px] text-gray-500 uppercase">user</span>
        <Copyable value={data.user.id} short={false} />
        {data.user.email && (
          <Copyable value={data.user.email} short={false} />
        )}
        <span className="ml-auto text-gray-500">
          {data.learnings.length} learning(s)
        </span>
      </header>

      <LearningList
        learnings={data.learnings.map((l) => ({
          id: l.id,
          createdAt:
            typeof l.createdAt === "string"
              ? l.createdAt
              : new Date(l.createdAt).toISOString(),
          updatedAt:
            typeof l.updatedAt === "string"
              ? l.updatedAt
              : new Date(l.updatedAt).toISOString(),
          deletedAt: l.deletedAt
            ? typeof l.deletedAt === "string"
              ? l.deletedAt
              : new Date(l.deletedAt).toISOString()
            : null,
          hasPlan: l.hasPlan,
          messageCount: l.messageCount,
        }))}
      />
    </div>
  );
}
