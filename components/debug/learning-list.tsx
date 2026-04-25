"use client";

import Link from "next/link";
import { Copyable } from "./copyable";
import { formatAbsTime } from "@/lib/debug/utils";
import { cn } from "@/lib/utils";

export type LearningListItem = {
  id: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt: string | Date | null;
  hasPlan: boolean;
  messageCount: number;
};

export function LearningList({ learnings }: { learnings: LearningListItem[] }) {
  if (learnings.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 font-mono text-sm">
        该用户没有 learning
      </div>
    );
  }

  return (
    <table className="w-full font-mono text-[12px] border-collapse">
      <thead>
        <tr className="text-left text-[11px] uppercase text-gray-500 border-b border-gray-200 dark:border-gray-800">
          <th className="py-2 pr-4">learningId</th>
          <th className="py-2 pr-4">createdAt</th>
          <th className="py-2 pr-4">updatedAt</th>
          <th className="py-2 pr-4">msgs</th>
          <th className="py-2 pr-4">plan</th>
          <th className="py-2 pr-4">deleted</th>
        </tr>
      </thead>
      <tbody>
        {learnings.map((l) => (
          <tr
            key={l.id}
            className={cn(
              "border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900",
              l.deletedAt && "opacity-50"
            )}
          >
            <td className="py-1.5 pr-4">
              <div className="flex items-center gap-2">
                <Copyable value={l.id} />
                <Link
                  href={`/debug/learning/${l.id}`}
                  className="text-blue-600 hover:underline text-[11px]"
                >
                  open
                </Link>
              </div>
            </td>
            <td className="py-1.5 pr-4 text-gray-700 dark:text-gray-300">
              {formatAbsTime(l.createdAt)}
            </td>
            <td className="py-1.5 pr-4 text-gray-700 dark:text-gray-300">
              {formatAbsTime(l.updatedAt)}
            </td>
            <td className="py-1.5 pr-4 text-gray-700 dark:text-gray-300">
              {l.messageCount}
            </td>
            <td className="py-1.5 pr-4">
              {l.hasPlan ? (
                <span className="text-emerald-600">✓</span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </td>
            <td className="py-1.5 pr-4 text-red-600 text-[11px]">
              {l.deletedAt ? formatAbsTime(l.deletedAt) : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
