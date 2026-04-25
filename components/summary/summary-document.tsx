import ReactMarkdown from "react-markdown";

export function SummaryDocument({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-stone dark:prose-invert max-w-none prose-headings:font-serif prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
