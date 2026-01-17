import { z } from "zod";

// 字幕单行结构：时间点 + 文本内容
const cueSchema = z.object({
  startMs: z.number().int().nonnegative().optional(),
  startLabel: z.string().min(1).optional(),
  text: z.string().min(1),
});

// 章节结构：可选时间点 + 章节标题
const chapterSchema = z.object({
  startMs: z.number().int().nonnegative().optional(),
  startLabel: z.string().min(1).optional(),
  title: z.string().min(1),
});

// 资源内容结构（当前用于 B 站采集的 summary / transcript）
const resourceContentSchema = z.object({
  version: z.number().optional(),
  metadata: z
    .object({
      platform: z.string().optional(),
      id: z.string().optional(),
      url: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
  content: z
    .object({
      summary: z
        .object({
          provider: z.string().optional(),
          text: z.string().optional(),
          chapters: z.array(chapterSchema).optional(),
        })
        .optional(),
      transcript: z
        .object({
          provider: z.string().optional(),
          language: z.string().optional(),
          lines: z.array(cueSchema),
        })
        .optional(),
    })
    .optional(),
});

// 最多保留的章节数量
const MAX_CHAPTERS = 50;
// 最多保留的字幕行数（节选）
const MAX_TRANSCRIPT_LINES = 2000;
// 摘要最大字符数（超出截断）
const MAX_SUMMARY_CHARS = 20000;

export type ResourceContext = {
  title: string;
  type: string;
  summaryText?: string;
  chapters?: string[];
  transcriptSnippet?: string[];
  transcriptTotalLines?: number;
};

function limitText(text: string, maxChars: number) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}…`;
}

function formatChapterTitle(title: string, startLabel?: string) {
  if (startLabel && startLabel.trim().length > 0) {
    return `[${startLabel.trim()}] ${title}`;
  }
  return title;
}

function formatTranscriptLine(line: z.infer<typeof cueSchema>) {
  const label = line.startLabel?.trim();
  return label ? `[${label}] ${line.text}` : line.text;
}

function buildResourceContext(resource: {
  title: string;
  type: string;
  content: unknown;
}): ResourceContext {
  const parsed = resourceContentSchema.safeParse(resource.content);
  const summaryTextRaw = parsed.success
    ? parsed.data.content?.summary?.text
    : undefined;
  const summaryText =
    summaryTextRaw && summaryTextRaw.trim().length > 0
      ? limitText(summaryTextRaw.trim(), MAX_SUMMARY_CHARS)
      : undefined;

  const chaptersRaw = parsed.success
    ? parsed.data.content?.summary?.chapters
    : undefined;
  const chapters =
    chaptersRaw && chaptersRaw.length > 0
      ? chaptersRaw
          .slice(0, MAX_CHAPTERS)
          .map((chapter) =>
            formatChapterTitle(chapter.title, chapter.startLabel)
          )
      : undefined;

  const transcriptLines = parsed.success
    ? parsed.data.content?.transcript?.lines
    : undefined;
  const transcriptSnippet =
    transcriptLines && transcriptLines.length > 0
      ? transcriptLines
          .slice(0, MAX_TRANSCRIPT_LINES)
          .map((line) => formatTranscriptLine(line))
      : undefined;

  return {
    title: resource.title.trim(),
    type: resource.type,
    summaryText,
    chapters,
    transcriptSnippet,
    transcriptTotalLines: transcriptLines?.length,
  };
}

// Example output:
// 素材标题：B站：React Hooks 入门
// 素材类型：bilibili_capture
//
// 摘要：
// 这是一个关于 React Hooks 的快速入门视频摘要……
//
// 章节要点：
// 1. [00:10] 为什么需要 Hooks
// 2. [02:30] useState 的基本用法
//
// 节选字幕：
// [00:12] Hooks 让函数组件拥有状态能力……
// [00:25] 我们先来看 useState……
// （已截取前 2 行，共 120 行）
function formatResourceContext(context: ResourceContext) {
  const lines = [`素材标题：${context.title}`, `素材类型：${context.type}`];

  if (context.summaryText) {
    lines.push("", "摘要：", context.summaryText);
  }

  if (context.chapters && context.chapters.length > 0) {
    lines.push("", "章节要点：");
    lines.push(
      ...context.chapters.map((chapter, index) => `${index + 1}. ${chapter}`)
    );
  }

  if (context.transcriptSnippet && context.transcriptSnippet.length > 0) {
    lines.push("", "节选字幕：");
    lines.push(...context.transcriptSnippet);
    if (
      typeof context.transcriptTotalLines === "number" &&
      context.transcriptTotalLines > context.transcriptSnippet.length
    ) {
      lines.push(
        `（已截取前 ${context.transcriptSnippet.length} 行，共 ${context.transcriptTotalLines} 行）`
      );
    }
  }

  return lines.join("\n");
}

function formatResourcesContext(contexts: ResourceContext[]) {
  return contexts
    .map((context, index) => {
      const header = `素材 ${index + 1}`;
      return [header, "-".repeat(header.length), formatResourceContext(context)]
        .filter((line) => line.trim().length > 0)
        .join("\n");
    })
    .join("\n\n");
}

export function getResourceContextText(resource: {
  title: string;
  type: string;
  content: unknown;
}) {
  const context = buildResourceContext(resource);
  return formatResourceContext(context);
}

export function getResourcesContextText(
  resources: Array<{ title: string; type: string; content: unknown }>
) {
  const contexts = resources.map((resource) => buildResourceContext(resource));
  return formatResourcesContext(contexts);
}
