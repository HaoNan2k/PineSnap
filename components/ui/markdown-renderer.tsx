"use client";

import dynamic from "next/dynamic";

const ReactMarkdown = dynamic(() => import("react-markdown").then((m) => m.default), {
  loading: () => <div className="animate-pulse h-96 bg-stone-50 rounded-xl" />,
});

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <article className="prose prose-stone prose-lg dark:prose-invert mx-auto max-w-none
      prose-headings:font-serif prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-stone-900

      /* 强制覆盖默认样式 - 模仿 Cursor 的宽松排版 */
      [&_p]:leading-[1.75] [&_p]:mb-6 [&_p]:text-stone-800

      [&_h2]:mt-12 [&_h2]:mb-6 [&_h2]:text-2xl [&_h2]:border-b [&_h2]:border-stone-100 [&_h2]:pb-4
      [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl

      [&_ul]:my-6 [&_li]:my-2 [&_li]:text-stone-800 [&_li]:leading-[1.75]

      prose-a:text-primary hover:prose-a:text-primary/80 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-stone-900 prose-strong:font-semibold">
      <ReactMarkdown>{content}</ReactMarkdown>
    </article>
  );
}
