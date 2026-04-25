import { describe, it, expect, beforeEach } from "vitest";
import { loadExtensionScript, resetCaptureGlobal } from "../test-utils";
import type {} from "../types";

interface ZhihuExtractor {
  provider: string;
  matches: (url: string) => boolean;
  extract: (ctx: {
    url: string;
    document: Document;
  }) => Promise<{
    ok: boolean;
    provider: string;
    code?: string;
    payload?: {
      sourceType: string;
      artifact: { kind: string; content: Record<string, unknown> };
      metadata: { platform: string; captureDiagnostics: Record<string, unknown> };
    };
  }>;
}

function installFakeDefuddle(result: Record<string, unknown>) {
  // @ts-expect-error - install global
  globalThis.PineSnapDefuddle = {
    Defuddle: class {
      doc: Document;
      constructor(doc: Document) {
        this.doc = doc;
      }
      parse() {
        return { ...result, parseTime: 1, domain: "zhihu.com" };
      }
    },
  };
}

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("zhihu-answer extractor", () => {
  beforeEach(() => {
    resetCaptureGlobal();
    loadExtensionScript("shared/runtime.js");
    loadExtensionScript("shared/extractors/lib/dom-cleanup.js");
    loadExtensionScript("shared/extractors/generic-article.js");
    loadExtensionScript("shared/extractors/zhihu-answer.js");
    loadExtensionScript("shared/extractor-registry.js");
  });

  function getExtractor(): ZhihuExtractor {
    return globalThis.PineSnapCapture.extractors!
      .zhihu_answer_v1 as unknown as ZhihuExtractor;
  }

  describe("matches", () => {
    it("matches answer + zhuanlan URLs", () => {
      const ext = getExtractor();
      expect(ext.matches("https://www.zhihu.com/question/12345/answer/67890")).toBe(true);
      expect(ext.matches("https://zhuanlan.zhihu.com/p/123456")).toBe(true);
    });

    it("does not match question listing or pin URLs", () => {
      const ext = getExtractor();
      expect(ext.matches("https://www.zhihu.com/question/12345")).toBe(false);
      expect(ext.matches("https://www.zhihu.com/pin/123")).toBe(false);
      expect(ext.matches("https://www.zhihu.com/")).toBe(false);
    });
  });

  describe("expandFoldedAnswer", () => {
    it("removes is-collapsed class so Defuddle sees full content", () => {
      const internals = globalThis.PineSnapCapture.extractors!.zhihu_answer_v1
        ._internals as unknown as { expandFoldedAnswer: (doc: Document) => number };
      const doc = makeDoc(`
        <div class="RichContent--unescapable is-collapsed"><p>folded</p></div>
        <div class="RichContent is-collapsed"><p>also folded</p></div>
      `);
      const expanded = internals.expandFoldedAnswer(doc);
      expect(expanded).toBe(2);
      expect(doc.querySelector(".is-collapsed")).toBeNull();
    });
  });

  describe("metadata extraction", () => {
    it("pulls author / publishedAt / voteCount on zhuanlan page", () => {
      const internals = globalThis.PineSnapCapture.extractors!.zhihu_answer_v1
        ._internals as unknown as {
        extractZhihuMetadata: (
          doc: Document,
          url: string
        ) => {
          author?: string;
          publishedAt?: string;
          cover?: string;
          voteCount?: number;
        };
      };
      const doc = makeDoc(`
        <html>
          <head>
            <meta property="og:image" content="https://pic1.zhimg.com/cover.jpg" />
          </head>
          <body>
            <div class="AuthorInfo-name"><a>张三</a></div>
            <time datetime="2026-03-01T00:00:00Z">3 月 1 日</time>
            <button class="VoteButton VoteButton--up" aria-label="赞同 1234">1.2 千</button>
          </body>
        </html>
      `);
      const meta = internals.extractZhihuMetadata(
        doc,
        "https://zhuanlan.zhihu.com/p/123"
      );
      expect(meta.author).toBe("张三");
      expect(meta.publishedAt).toBe("2026-03-01T00:00:00Z");
      expect(meta.cover).toBe("https://pic1.zhimg.com/cover.jpg");
      expect(meta.voteCount).toBe(1234);
    });
  });

  describe("extract", () => {
    it("emits extracted_text + markdown payload, platform=zhihu", async () => {
      installFakeDefuddle({
        contentMarkdown:
          "# 知乎答案标题\n\n这是答案正文。" + "x".repeat(80),
        title: "知乎答案标题",
      });

      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://zhuanlan.zhihu.com/p/123",
        document: makeDoc(`
          <html>
            <body>
              <div class="AuthorInfo-name"><a>李四</a></div>
              <article><p>正文 placeholder</p></article>
              <div class="RichContent--unescapable is-collapsed"><p>folded</p></div>
              <div class="RecommendItem">推荐</div>
            </body>
          </html>
        `),
      });

      expect(result.ok).toBe(true);
      expect(result.payload?.sourceType).toBe("web_page");
      expect(result.payload?.artifact.kind).toBe("extracted_text");
      expect(result.payload?.metadata.platform).toBe("zhihu");
      expect(result.payload?.artifact.content.author).toBe("李四");

      const diag = result.payload?.metadata.captureDiagnostics as {
        provider: string;
        zhihuHooks?: { foldedExpanded?: number; noisyNodesRemoved?: number };
      };
      expect(diag.provider).toBe("zhihu_answer_v1");
      expect(diag.zhihuHooks?.foldedExpanded).toBeGreaterThanOrEqual(1);
      expect(diag.zhihuHooks?.noisyNodesRemoved).toBeGreaterThanOrEqual(1);
    });
  });
});
