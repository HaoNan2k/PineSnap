import { Play } from "lucide-react";

import type { KeyMoment } from "@/lib/summary/schema";

interface KeyMomentsProps {
  moments: KeyMoment[];
  sourceType: string;
  canonicalUrl: string;
}

export function KeyMoments({ moments, sourceType, canonicalUrl }: KeyMomentsProps) {
  if (!moments || moments.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl text-primary dark:text-white mb-4">
        关键时刻
      </h2>
      <ul className="flex flex-col gap-1">
        {moments.map((moment, i) => {
          const href = buildTimestampUrl(sourceType, canonicalUrl, moment.seconds);
          const content = (
            <>
              <span className="font-mono text-sm text-acorn-dark dark:text-acorn-light tabular-nums shrink-0">
                {formatTime(moment.seconds)}
              </span>
              <span className="text-forest-muted group-hover:text-primary dark:group-hover:text-white transition-colors">
                {moment.label}
              </span>
            </>
          );

          if (href) {
            return (
              <li key={i}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-3 py-2 -mx-3 rounded-lg hover:bg-sand/10 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-acorn shrink-0" aria-hidden />
                  {content}
                </a>
              </li>
            );
          }

          return (
            <li key={i} className="flex items-center gap-3 px-3 py-2 -mx-3">
              <Play className="w-3.5 h-3.5 text-forest-muted/40 shrink-0" aria-hidden />
              {content}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildTimestampUrl(
  sourceType: string,
  canonicalUrl: string,
  seconds: number
): string | null {
  if (sourceType === "bilibili") {
    const bvid = extractBvid(canonicalUrl);
    if (!bvid) return null;
    return `https://www.bilibili.com/video/${bvid}?t=${seconds}`;
  }
  return null;
}

function extractBvid(url: string): string | null {
  const match = url.match(/BV[A-Za-z0-9]{10}/);
  return match ? match[0] : null;
}
