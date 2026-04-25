import { describe, it, expect, beforeEach } from "vitest";
import { loadExtensionScript, resetCaptureGlobal } from "./test-utils";
import type {} from "./types";

describe("extractor-registry", () => {
  beforeEach(() => {
    resetCaptureGlobal();
    loadExtensionScript("shared/runtime.js");
    loadExtensionScript("shared/extractors/lib/dom-cleanup.js");
    loadExtensionScript("shared/extractors/bilibili-full-subtitle.js");
    // 阶段 A 只注册 bilibili。其他 extractor 在阶段 B 加。
    // 为路由测试，临时注册 stub。
    globalThis.PineSnapCapture.extractors = {
      ...(globalThis.PineSnapCapture.extractors || {}),
      youtube_subtitle_v1: {
        provider: "youtube_subtitle_v1",
        matches: (url: string) => /youtube\.com\/watch/.test(url),
      },
      wechat_article_v1: {
        provider: "wechat_article_v1",
        matches: (url: string) => /mp\.weixin\.qq\.com\/s/.test(url),
      },
      zhihu_answer_v1: {
        provider: "zhihu_answer_v1",
        matches: (url: string) =>
          /zhihu\.com\/(question\/.*\/answer|p\/)/.test(url) ||
          /zhuanlan\.zhihu\.com\/p\//.test(url),
      },
      generic_article_v1: {
        provider: "generic_article_v1",
        matches: () => true,
      },
    };
    loadExtensionScript("shared/extractor-registry.js");
  });

  describe("pickExtractor", () => {
    it("picks bilibili extractor for B 站 video URL", () => {
      const ext = globalThis.PineSnapCapture.registry!.pickExtractor(
        "https://www.bilibili.com/video/BV1xx411c7mD"
      );
      expect(ext?.provider).toBe("bilibili_full_subtitle_v1");
    });

    it("picks youtube extractor for youtube watch URL", () => {
      const ext = globalThis.PineSnapCapture.registry!.pickExtractor(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(ext?.provider).toBe("youtube_subtitle_v1");
    });

    it("picks wechat extractor for mp.weixin.qq.com/s URL", () => {
      const ext = globalThis.PineSnapCapture.registry!.pickExtractor(
        "https://mp.weixin.qq.com/s/abcdef"
      );
      expect(ext?.provider).toBe("wechat_article_v1");
    });

    it("picks zhihu extractor for zhuanlan article URL", () => {
      const ext = globalThis.PineSnapCapture.registry!.pickExtractor(
        "https://zhuanlan.zhihu.com/p/123456"
      );
      expect(ext?.provider).toBe("zhihu_answer_v1");
    });

    it("picks zhihu extractor for question/answer URL", () => {
      const ext = globalThis.PineSnapCapture.registry!.pickExtractor(
        "https://www.zhihu.com/question/12345/answer/67890"
      );
      expect(ext?.provider).toBe("zhihu_answer_v1");
    });

    it("falls back to generic article for unknown blog URL", () => {
      const ext = globalThis.PineSnapCapture.registry!.pickExtractor(
        "https://overreacted.io/algebraic-effects-for-the-rest-of-us/"
      );
      expect(ext?.provider).toBe("generic_article_v1");
    });

    it("falls back to generic for SPA docs", () => {
      const ext = globalThis.PineSnapCapture.registry!.pickExtractor(
        "https://react.dev/learn"
      );
      expect(ext?.provider).toBe("generic_article_v1");
    });
  });

  describe("ERROR_CODES + isFallbackable", () => {
    it("returns true for subtitle failure codes (ASR fallback)", () => {
      const { ERROR_CODES, isFallbackable } = globalThis.PineSnapCapture.registry!;
      expect(isFallbackable(ERROR_CODES.NO_SUBTITLE_TRACK)).toBe(true);
      expect(isFallbackable(ERROR_CODES.SUBTITLE_TRACK_UNSTABLE)).toBe(true);
      expect(isFallbackable(ERROR_CODES.SUBTITLE_FETCH_FAILED)).toBe(true);
      expect(isFallbackable(ERROR_CODES.SUBTITLE_REQUIRES_LOGIN)).toBe(true);
      expect(isFallbackable(ERROR_CODES.MISSING_CID)).toBe(true);
    });

    it("returns false for terminal codes", () => {
      const { ERROR_CODES, isFallbackable } = globalThis.PineSnapCapture.registry!;
      expect(isFallbackable(ERROR_CODES.MISSING_VIDEO_CONTEXT)).toBe(false);
      expect(isFallbackable(ERROR_CODES.NOT_AN_ARTICLE)).toBe(false);
      expect(isFallbackable(ERROR_CODES.EXTRACT_EMPTY)).toBe(false);
      expect(isFallbackable(ERROR_CODES.EXTRACT_BLOCKED)).toBe(false);
    });

    it("returns false for unknown code", () => {
      expect(globalThis.PineSnapCapture.registry!.isFallbackable("UNKNOWN")).toBe(false);
    });
  });
});
