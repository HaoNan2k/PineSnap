"use client";

import { useState } from "react";
import { Copyable } from "./copyable";
import { JsonBlock } from "./json-block";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { formatAbsTime } from "@/lib/debug/utils";
import { cn } from "@/lib/utils";

type Resource = {
  resource: { id: string; title: string; sourceType: string };
};

type ConversationSummary = {
  conversation: {
    id: string;
    kind: "canvas" | "chat";
    messages: Array<unknown>;
  };
};

export function LearningMetaCard({
  learning,
  user,
  truncated,
  messageCap,
}: {
  learning: {
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    deletedAt: string | Date | null;
    plan: string | null;
    clarify: unknown;
    resources: Resource[];
    conversations: ConversationSummary[];
  };
  user: { id: string; email: string | null } | null;
  truncated: boolean;
  messageCap: number;
}) {
  const [showPlan, setShowPlan] = useState(false);
  const [showClarify, setShowClarify] = useState(false);

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded bg-gray-50 dark:bg-gray-900 p-3 font-mono text-[12px]">
      {truncated && (
        <div className="mb-3 px-2 py-1 bg-yellow-100 border border-yellow-300 text-yellow-900 rounded text-[11px]">
          ⚠ 消息总数超过 {messageCap}，已截断。后续消息未显示。
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <Field label="learningId">
          <Copyable value={learning.id} short={false} />
        </Field>
        <Field label="userId">
          {user ? <Copyable value={user.id} /> : <span className="text-gray-400">—</span>}
        </Field>
        <Field label="email">
          {user?.email ? <Copyable value={user.email} short={false} /> : <span className="text-gray-400">—</span>}
        </Field>
        <Field label="hasPlan">
          <span>{learning.plan ? "✓" : "—"}</span>
        </Field>
        <Field label="createdAt">
          <span className="text-gray-700 dark:text-gray-300">
            {formatAbsTime(learning.createdAt)}
          </span>
        </Field>
        <Field label="updatedAt">
          <span className="text-gray-700 dark:text-gray-300">
            {formatAbsTime(learning.updatedAt)}
          </span>
        </Field>
        {learning.deletedAt && (
          <Field label="deletedAt">
            <span className="text-red-600">{formatAbsTime(learning.deletedAt)}</span>
          </Field>
        )}
      </div>

      {/* Resources */}
      <div className="mt-3">
        <div className="text-[11px] text-gray-500 uppercase mb-1">
          resources ({learning.resources.length})
        </div>
        <ul className="space-y-1">
          {learning.resources.map((r) => (
            <li key={r.resource.id} className="flex items-center gap-2">
              <Copyable value={r.resource.id} />
              <span className="text-gray-400 text-[10px]">{r.resource.sourceType}</span>
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {r.resource.title}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Conversations */}
      <div className="mt-3">
        <div className="text-[11px] text-gray-500 uppercase mb-1">
          conversations ({learning.conversations.length})
        </div>
        <ul className="space-y-1">
          {learning.conversations.map((c) => (
            <li key={c.conversation.id} className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-700 text-[10px] uppercase">
                {c.conversation.kind}
              </span>
              <Copyable value={c.conversation.id} />
              <span className="text-gray-500 text-[11px]">
                {c.conversation.messages.length} msgs
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Clarify */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowClarify((v) => !v)}
          className={cn(
            "text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 uppercase",
            showClarify && "text-gray-900 dark:text-gray-100"
          )}
        >
          {showClarify ? "▼" : "▶"} clarify
        </button>
        {showClarify && (
          <div className="mt-1">
            {learning.clarify ? (
              <JsonBlock value={learning.clarify} collapseLevel={2} />
            ) : (
              <span className="text-gray-400 text-[11px]">null</span>
            )}
          </div>
        )}
      </div>

      {/* Plan */}
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowPlan((v) => !v)}
          className={cn(
            "text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 uppercase",
            showPlan && "text-gray-900 dark:text-gray-100"
          )}
        >
          {showPlan ? "▼" : "▶"} plan
        </button>
        {showPlan && (
          <div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3">
            {learning.plan ? (
              <MarkdownRenderer content={learning.plan} />
            ) : (
              <span className="text-gray-400 text-[11px]">null</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 uppercase w-20 shrink-0">
        {label}
      </span>
      <div className="min-w-0 truncate">{children}</div>
    </div>
  );
}
