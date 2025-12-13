import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy } from "lucide-react";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 px-2 py-1 text-xs rounded-md border border-border bg-surface text-fg-muted hover:bg-surface-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 900);
        } catch {
          // ignore
        }
      }}
      aria-label="Copy"
      title="Copy"
    >
      <Copy size={14} />
      <span className="select-none">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function MarkdownContent({ content }: { content: string }) {
  const normalized = useMemo(() => content ?? "", [content]);

  return (
    <div className="text-[15px] leading-relaxed text-fg break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-3">{children}</p>,
          ul: ({ children }) => <ul className="my-3 pl-5 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 pl-5 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-4 border-l-2 border-border text-fg-muted">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          a: ({ children, ...props }) => (
            <a
              {...props}
              className="underline underline-offset-4 text-fg"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ children, className, ...props }) => {
            const raw = String(children ?? "");
            const isBlock = /\blanguage-/.test(className ?? "");

            if (!isBlock) {
              return (
                <code
                  {...props}
                  className="px-1 py-0.5 rounded border border-border bg-surface-2 text-[0.9em]"
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                  <div className="text-xs text-fg-faint truncate">
                    {className?.replace("language-", "") ?? "code"}
                  </div>
                  <CopyButton value={raw.replace(/\n$/, "")} />
                </div>
                <pre className="m-0 p-3 overflow-x-auto text-sm leading-relaxed">
                  <code className="font-mono">{raw}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

