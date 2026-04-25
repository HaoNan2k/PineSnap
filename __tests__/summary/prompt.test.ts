// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  PROMPT_VERSION,
  buildSummarySystemPrompt,
  buildSummaryUserMessage,
} from "@/lib/summary/prompt";

describe("summary prompt", () => {
  it("uses prompt version v2", () => {
    expect(PROMPT_VERSION).toBe("v2");
  });

  it("system prompt declares the structured-note role and three output fields", () => {
    const prompt = buildSummarySystemPrompt();
    expect(prompt).toContain("结构化阅读笔记生成器");
    expect(prompt).toContain("oneLineSummary");
    expect(prompt).toContain("markdown");
    expect(prompt).toContain("keyMoments");
  });

  it("system prompt drops legacy artifact-era directives", () => {
    const prompt = buildSummarySystemPrompt();
    const banned = [
      "web 艺术家",
      "完整的、独立的 HTML",
      "motion 元素",
      "<!DOCTYPE",
      "Tailwind Play CDN",
      "anime.js",
    ];
    for (const phrase of banned) {
      expect(
        prompt.includes(phrase),
        `prompt 不应包含遗留 artifact 指令: ${phrase}`
      ).toBe(false);
    }
  });

  it("user message embeds resource metadata and asks for the three fields", () => {
    const message = buildSummaryUserMessage({
      title: "测试标题",
      sourceType: "bilibili",
      canonicalUrl: "https://www.bilibili.com/video/BV1ABCdEFGHi",
      content: { content: { transcript: { lines: [] } } },
    });
    expect(message).toContain("测试标题");
    expect(message).toContain("bilibili");
    expect(message).toContain("BV1ABCdEFGHi");
    expect(message).toContain("oneLineSummary");
    expect(message).toContain("markdown");
    expect(message).toContain("keyMoments");
  });
});
