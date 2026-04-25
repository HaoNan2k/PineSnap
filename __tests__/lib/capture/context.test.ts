import { describe, it, expect } from "vitest";
import {
  captureSourceTypeSchema,
  captureJobTypeSchema,
  captureContextSchema,
  inferJobTypeFromSource,
  webPageExtractorSchema,
} from "@/lib/capture/context";

describe("captureSourceTypeSchema (Phase C consolidated)", () => {
  it("accepts the 4 retained source types", () => {
    expect(captureSourceTypeSchema.safeParse("bilibili").success).toBe(true);
    expect(captureSourceTypeSchema.safeParse("web_page").success).toBe(true);
    expect(captureSourceTypeSchema.safeParse("youtube").success).toBe(true);
    expect(captureSourceTypeSchema.safeParse("douyin").success).toBe(true);
  });

  it("rejects the dropped source types", () => {
    expect(captureSourceTypeSchema.safeParse("wechat_article").success).toBe(false);
    expect(captureSourceTypeSchema.safeParse("xiaohongshu").success).toBe(false);
  });
});

describe("captureJobTypeSchema (Phase C consolidated)", () => {
  it("accepts the retained job types", () => {
    expect(captureJobTypeSchema.safeParse("subtitle_fetch").success).toBe(true);
    expect(captureJobTypeSchema.safeParse("audio_transcribe").success).toBe(true);
    expect(captureJobTypeSchema.safeParse("web_extract").success).toBe(true);
    expect(captureJobTypeSchema.safeParse("summary_generate").success).toBe(true);
    expect(captureJobTypeSchema.safeParse("media_ingest").success).toBe(true);
  });

  it("rejects article_extract (merged into web_extract)", () => {
    expect(captureJobTypeSchema.safeParse("article_extract").success).toBe(false);
  });
});

describe("webPageExtractorSchema", () => {
  it("accepts the 3 currently registered extractor providers", () => {
    expect(webPageExtractorSchema.safeParse("generic_article_v1").success).toBe(true);
    expect(webPageExtractorSchema.safeParse("wechat_article_v1").success).toBe(true);
    expect(webPageExtractorSchema.safeParse("zhihu_answer_v1").success).toBe(true);
  });

  it("rejects unknown extractor ids", () => {
    expect(webPageExtractorSchema.safeParse("unknown_v1").success).toBe(false);
    expect(webPageExtractorSchema.safeParse("").success).toBe(false);
  });
});

describe("inferJobTypeFromSource", () => {
  it("video sources → audio_transcribe", () => {
    expect(inferJobTypeFromSource("bilibili")).toBe("audio_transcribe");
    expect(inferJobTypeFromSource("youtube")).toBe("audio_transcribe");
    expect(inferJobTypeFromSource("douyin")).toBe("audio_transcribe");
  });

  it("web_page → web_extract", () => {
    expect(inferJobTypeFromSource("web_page")).toBe("web_extract");
  });
});

describe("captureContextSchema providerContext", () => {
  it("accepts webPage with extractor field set to a known provider", () => {
    const result = captureContextSchema.safeParse({
      schemaVersion: 1,
      sourceType: "web_page",
      sourceUrl: "https://example.com/post",
      captureRequestId: "abcdef12",
      capturedAt: new Date().toISOString(),
      providerContext: {
        webPage: {
          titleHint: "My Post",
          extractor: "wechat_article_v1",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects webPage with unknown extractor", () => {
    const result = captureContextSchema.safeParse({
      schemaVersion: 1,
      sourceType: "web_page",
      sourceUrl: "https://example.com/post",
      captureRequestId: "abcdef12",
      capturedAt: new Date().toISOString(),
      providerContext: {
        webPage: { extractor: "rogue_extractor" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects sourceType=wechat_article (Phase C dropped)", () => {
    const result = captureContextSchema.safeParse({
      schemaVersion: 1,
      sourceType: "wechat_article",
      sourceUrl: "https://mp.weixin.qq.com/s/x",
      captureRequestId: "abcdef12",
      capturedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
