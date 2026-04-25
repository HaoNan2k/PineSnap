import { describe, it, expect, beforeEach } from "vitest";
import { loadExtensionScript, resetCaptureGlobal } from "../test-utils";
import type {} from "../types";

interface WechatExtractor {
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
        return { ...result, parseTime: 1, domain: "mp.weixin.qq.com" };
      }
    },
  };
}

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("wechat-article extractor", () => {
  beforeEach(() => {
    resetCaptureGlobal();
    loadExtensionScript("shared/runtime.js");
    loadExtensionScript("shared/extractors/lib/dom-cleanup.js");
    loadExtensionScript("shared/extractors/generic-article.js");
    loadExtensionScript("shared/extractors/wechat-article.js");
    loadExtensionScript("shared/extractor-registry.js");
  });

  function getExtractor(): WechatExtractor {
    return globalThis.PineSnapCapture.extractors!
      .wechat_article_v1 as unknown as WechatExtractor;
  }

  describe("matches", () => {
    it("matches mp.weixin.qq.com/s URLs", () => {
      const ext = getExtractor();
      expect(ext.matches("https://mp.weixin.qq.com/s/abcdef")).toBe(true);
      expect(ext.matches("http://mp.weixin.qq.com/s?xxx")).toBe(true);
    });

    it("does not match other URLs", () => {
      const ext = getExtractor();
      expect(ext.matches("https://www.bilibili.com/video/BV1")).toBe(false);
      expect(ext.matches("https://zhuanlan.zhihu.com/p/123")).toBe(false);
      expect(ext.matches("https://example.com/")).toBe(false);
    });
  });

  describe("metadata extraction (DOM hooks)", () => {
    it("pulls author + publishedAt + cover from wechat-specific selectors", () => {
      const internals = globalThis.PineSnapCapture.extractors!.wechat_article_v1
        ._internals as unknown as {
        extractWeChatMetadata: (
          doc: Document
        ) => { author?: string; publishedAt?: string; cover?: string };
      };
      const doc = makeDoc(`
        <html>
          <head>
            <meta property="og:image" content="https://mmbiz.qpic.cn/cover.jpg" />
            <meta property="article:published_time" content="2026-04-01T00:00:00Z" />
          </head>
          <body>
            <strong id="js_name">某公众号</strong>
            <em id="publish_time">2026-04-01</em>
          </body>
        </html>
      `);
      const meta = internals.extractWeChatMetadata(doc);
      expect(meta.author).toBe("某公众号");
      expect(meta.publishedAt).toBe("2026-04-01");
      expect(meta.cover).toBe("https://mmbiz.qpic.cn/cover.jpg");
    });
  });

  describe("extract", () => {
    it("emits extracted_text + markdown payload, platform=wechat", async () => {
      installFakeDefuddle({
        contentMarkdown:
          "# 文章标题\n\n这是公众号正文。长度足够 50 字符以上以避免 EXTRACT_EMPTY 触发。" +
          "继续填充以确保超过阈值。",
        title: "文章标题",
      });

      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://mp.weixin.qq.com/s/abcdef",
        document: makeDoc(`
          <html>
            <head>
              <meta property="og:image" content="https://mmbiz.qpic.cn/x.jpg" />
            </head>
            <body>
              <strong id="js_name">公众号 A</strong>
              <em id="publish_time">2026-04-01</em>
              <article><p>正文 placeholder</p></article>
              <div class="reward_area">打赏</div>
              <img data-src="https://mmbiz.qpic.cn/lazy.jpg" />
            </body>
          </html>
        `),
      });

      expect(result.ok).toBe(true);
      expect(result.payload?.sourceType).toBe("web_page");
      expect(result.payload?.artifact.kind).toBe("extracted_text");
      expect(result.payload?.metadata.platform).toBe("wechat");

      // wechat metadata override
      expect(result.payload?.artifact.content.author).toBe("公众号 A");
      expect(result.payload?.artifact.content.publishedAt).toBe("2026-04-01");
      expect(result.payload?.artifact.content.cover).toBe("https://mmbiz.qpic.cn/x.jpg");

      // wechatHooks 诊断字段记录了清洗动作
      const diag = result.payload?.metadata.captureDiagnostics as {
        wechatHooks?: { lazyImagesTouched?: number; noisyNodesRemoved?: number };
        provider: string;
      };
      expect(diag.provider).toBe("wechat_article_v1");
      expect(diag.wechatHooks?.lazyImagesTouched).toBeGreaterThanOrEqual(1);
      expect(diag.wechatHooks?.noisyNodesRemoved).toBeGreaterThanOrEqual(1);
    });

    it("returns EXTRACT_EMPTY when Defuddle yields tiny markdown", async () => {
      installFakeDefuddle({ contentMarkdown: "x", title: "y" });

      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://mp.weixin.qq.com/s/empty",
        document: makeDoc("<html><body></body></html>"),
      });

      expect(result.ok).toBe(false);
      expect(result.code).toBe("EXTRACT_EMPTY");
    });
  });
});
