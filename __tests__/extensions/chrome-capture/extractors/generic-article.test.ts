import { describe, it, expect, beforeEach } from "vitest";
import { loadExtensionScript, resetCaptureGlobal } from "../test-utils";
import type {} from "../types";

interface GenericExtractor {
  provider: string;
  matches: (url: string) => boolean;
  extract: (ctx: {
    url: string;
    document: Document;
    fetchJson?: unknown;
  }) => Promise<{
    ok: boolean;
    provider: string;
    code?: string;
    payload?: {
      sourceType: string;
      artifact: { kind: string; format: string; content: Record<string, unknown> };
      metadata: { platform: string; captureDiagnostics: Record<string, unknown> };
    };
    diagnostics?: Record<string, unknown>;
  }>;
}

/** 模拟 Defuddle bundle，避免真跑 Defuddle 库（已经有它自己的测试，且对 jsdom DOM 形态敏感）。 */
function installFakeDefuddle(result: Record<string, unknown>) {
  // @ts-expect-error - install global for content-script-style code
  globalThis.PineSnapDefuddle = {
    Defuddle: class {
      doc: Document;
      opts: unknown;
      constructor(doc: Document, opts: unknown) {
        this.doc = doc;
        this.opts = opts;
      }
      parse() {
        return { ...result, parseTime: 1, domain: "example.com" };
      }
    },
  };
}

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("generic-article extractor", () => {
  beforeEach(() => {
    resetCaptureGlobal();
    loadExtensionScript("shared/runtime.js");
    loadExtensionScript("shared/extractors/lib/dom-cleanup.js");
    loadExtensionScript("shared/extractors/generic-article.js");
    loadExtensionScript("shared/extractor-registry.js");
  });

  function getExtractor(): GenericExtractor {
    return globalThis.PineSnapCapture.extractors!
      .generic_article_v1 as unknown as GenericExtractor;
  }

  describe("matches", () => {
    it("matches every URL (it's the fallback)", () => {
      const ext = getExtractor();
      expect(ext.matches("https://overreacted.io/x")).toBe(true);
      expect(ext.matches("https://random.example.com/")).toBe(true);
      expect(ext.matches("about:blank")).toBe(true);
    });
  });

  describe("extract", () => {
    it("returns extracted_text + markdown payload on happy path", async () => {
      installFakeDefuddle({
        contentMarkdown:
          "# Article Title\n\nThis is the body of the article. " +
          "It is well over 50 characters so EXTRACT_EMPTY is not triggered.",
        title: "Article Title",
        author: "Jane Doe",
        published: "2026-01-15T10:00:00Z",
        image: "https://example.com/cover.png",
        wordCount: 17,
      });

      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://example.com/post",
        document: makeDoc("<html><head><title>Article Title</title></head><body><p>x</p></body></html>"),
      });

      expect(result.ok).toBe(true);
      expect(result.provider).toBe("generic_article_v1");
      expect(result.payload?.sourceType).toBe("web_page");
      expect(result.payload?.artifact.kind).toBe("extracted_text");
      expect(result.payload?.artifact.format).toBe("markdown");

      const content = result.payload!.artifact.content;
      expect(content.markdown).toMatch(/Article Title/);
      expect(content.title).toBe("Article Title");
      expect(content.author).toBe("Jane Doe");
      expect(content.publishedAt).toBe("2026-01-15T10:00:00Z");
      expect(content.cover).toBe("https://example.com/cover.png");
      expect(content.wordCount).toBe(17);
      expect(typeof content.sourceHtml).toBe("string");

      expect(result.payload?.metadata.platform).toBe("web_page");
      expect(result.payload?.metadata.captureDiagnostics.provider).toBe("generic_article_v1");
    });

    it("returns EXTRACT_EMPTY when markdown is too short", async () => {
      installFakeDefuddle({ contentMarkdown: "tiny", title: "x" });

      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://example.com/empty",
        document: makeDoc("<html><body></body></html>"),
      });

      expect(result.ok).toBe(false);
      expect(result.code).toBe("EXTRACT_EMPTY");
    });

    it("falls back to plain `content` when contentMarkdown missing", async () => {
      installFakeDefuddle({
        content:
          "<p>Plain HTML content that is long enough to pass the minimum length threshold.</p>",
        title: "Fallback",
      });

      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://example.com/fallback",
        document: makeDoc("<html><body></body></html>"),
      });

      expect(result.ok).toBe(true);
      expect(result.payload?.artifact.content.markdown).toMatch(/Plain HTML content/);
    });

    it("returns EXTRACT_EMPTY when Defuddle bundle is not loaded", async () => {
      // @ts-expect-error - intentionally uninstall
      delete globalThis.PineSnapDefuddle;

      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://example.com/x",
        document: makeDoc("<html><body><p>x</p></body></html>"),
      });

      expect(result.ok).toBe(false);
      expect(result.code).toBe("EXTRACT_EMPTY");
      expect(result.diagnostics?.error).toMatch(/Defuddle/);
    });
  });

  describe("snapshotSourceHtml", () => {
    it("truncates HTML over 500KB", () => {
      installFakeDefuddle({ contentMarkdown: "irrelevant" });
      const internals = globalThis.PineSnapCapture.extractors!.generic_article_v1
        ._internals as unknown as {
        snapshotSourceHtml: (doc: Document) => {
          sourceHtml: string;
          truncated: boolean;
          bytes: number;
        };
        SOURCE_HTML_MAX_BYTES: number;
      };
      // 600KB of <p>x</p> = ~3KB elements × 200... easier: build big HTML directly.
      const bigBody = "x".repeat(600 * 1024);
      const doc = makeDoc(`<html><body><p>${bigBody}</p></body></html>`);
      const snap = internals.snapshotSourceHtml(doc);
      expect(snap.truncated).toBe(true);
      expect(snap.bytes).toBeGreaterThan(500 * 1024);
      expect(snap.sourceHtml.length).toBeLessThanOrEqual(snap.bytes);
      expect(snap.sourceHtml).toMatch(/TRUNCATED/);
    });

    it("returns full HTML when under threshold", () => {
      const internals = globalThis.PineSnapCapture.extractors!.generic_article_v1
        ._internals as unknown as {
        snapshotSourceHtml: (doc: Document) => {
          sourceHtml: string;
          truncated: boolean;
        };
      };
      const doc = makeDoc("<html><body><p>tiny</p></body></html>");
      const snap = internals.snapshotSourceHtml(doc);
      expect(snap.truncated).toBe(false);
      expect(snap.sourceHtml).toMatch(/<p>tiny<\/p>/);
    });
  });
});
