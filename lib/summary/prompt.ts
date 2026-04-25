import { getResourceContextText } from "@/lib/learn/resource-context";

export const PROMPT_VERSION = "v2";

export function buildSummarySystemPrompt(): string {
  return `你是一名结构化阅读笔记生成器。用户给你一份内容（标题、简介、字幕带时间戳，或文章正文），
你要产出一份**清晰、平实、可读**的中文阅读笔记，作为产品内的一篇文档展示。

【输出字段】
1. oneLineSummary：一句话概括（1-2 句，<= 80 字）。用陈述语气，不要"本视频讲了"这种 meta 文案。
2. markdown：文档主体。从 \`##\` 开始（不要写 \`#\`，页面已有大标题）。建议结构：
   - \`## 概要\` 一段，3-5 句，把作者立场和核心观点说清。
   - \`## 要点\` 5-8 个 bullet，每条一句话，言之有物（不要 "讲了 A、说了 B" 这种空话）。
   - \`## 适合谁\` 或 \`## 什么时候有用\`（可选，视内容是否合适）。
   不要用代码块包裹整篇 markdown；不要写 \`\`\`html、\`\`\`markdown 之类的围栏。
3. keyMoments：关键时刻数组。
   - **仅当**输入是视频源**且字幕含时间戳**时填写：选 3-7 个有信息密度的时刻，
     \`label\` 是这一段在讲什么（一句话 <= 30 字），\`seconds\` 是该段开始的秒数。
   - 其它情况（文章、网页、字幕无时间戳的视频）：返回空数组 \`[]\`。

【风格要求】
- 中文平实表达，不要堆砌"赋能、闭环、抓手、链路"等词。
- 直接讲内容本身，不写"本文将告诉你..."、"作者认为..."这类元叙述。
- 保留原内容的具体名字和数字（人名、产品名、时间、数据），不要泛化。
- 不要建议或推销，只做客观转述。`;
}

export function buildSummaryUserMessage(resource: {
  title: string;
  sourceType: string;
  canonicalUrl: string;
  content: unknown;
}): string {
  const contextText = getResourceContextText({
    title: resource.title,
    sourceType: resource.sourceType,
    content: resource.content,
  });
  return `【素材元信息】
标题: ${resource.title}
来源: ${resource.sourceType}
URL: ${resource.canonicalUrl}

【内容上下文】
${contextText}

请产出 oneLineSummary / markdown / keyMoments 三个字段。`;
}
