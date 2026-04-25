import { describe, it, expect, beforeEach } from "vitest";
import { loadExtensionScript, resetCaptureGlobal } from "../test-utils";
import type {} from "../types";

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("dom-cleanup", () => {
  beforeEach(() => {
    resetCaptureGlobal();
    loadExtensionScript("shared/runtime.js");
    loadExtensionScript("shared/extractors/lib/dom-cleanup.js");
  });

  describe("expandLazyImages", () => {
    it("copies data-src to src when src is empty", () => {
      const doc = makeDoc(
        `<img data-src="https://example.com/a.png"><img data-original="//cdn.example.com/b.png">`
      );
      const touched = globalThis.PineSnapCapture.domCleanup!.expandLazyImages(doc);
      expect(touched).toBe(2);
      const imgs = doc.querySelectorAll("img");
      expect(imgs[0].getAttribute("src")).toBe("https://example.com/a.png");
      expect(imgs[1].getAttribute("src")).toBe("https://cdn.example.com/b.png");
    });

    it("leaves img with existing src untouched", () => {
      const doc = makeDoc(
        `<img src="https://example.com/has.png" data-src="https://example.com/other.png">`
      );
      globalThis.PineSnapCapture.domCleanup!.expandLazyImages(doc);
      expect(doc.querySelector("img")?.getAttribute("src")).toBe(
        "https://example.com/has.png"
      );
    });

    it("upgrades protocol-relative src to https", () => {
      const doc = makeDoc(`<img src="//example.com/c.png">`);
      const touched = globalThis.PineSnapCapture.domCleanup!.expandLazyImages(doc);
      expect(touched).toBe(1);
      expect(doc.querySelector("img")?.getAttribute("src")).toBe(
        "https://example.com/c.png"
      );
    });
  });

  describe("removeSelectors", () => {
    it("removes all matching nodes and returns count", () => {
      const doc = makeDoc(
        `<article><p>keep</p><div class="ad">spam</div><div class="ad">spam2</div><aside class="recommend">x</aside></article>`
      );
      const removed = globalThis.PineSnapCapture.domCleanup!.removeSelectors(doc, [
        ".ad",
        ".recommend",
      ]);
      expect(removed).toBe(3);
      expect(doc.querySelectorAll(".ad")).toHaveLength(0);
      expect(doc.querySelectorAll(".recommend")).toHaveLength(0);
      expect(doc.querySelector("p")?.textContent).toBe("keep");
    });
  });

  describe("stripTrackingParams", () => {
    it("removes utm_*, spm, from, share_, ref params", () => {
      const cleaned = globalThis.PineSnapCapture.domCleanup!.stripTrackingParams(
        "https://example.com/post?utm_source=x&id=1&spm=y&ref=z&keep=ok"
      );
      const parsed = new URL(cleaned);
      expect(parsed.searchParams.get("id")).toBe("1");
      expect(parsed.searchParams.get("keep")).toBe("ok");
      expect(parsed.searchParams.get("utm_source")).toBeNull();
      expect(parsed.searchParams.get("spm")).toBeNull();
      expect(parsed.searchParams.get("ref")).toBeNull();
    });

    it("returns original URL on parse error", () => {
      const out = globalThis.PineSnapCapture.domCleanup!.stripTrackingParams(
        "not-a-url"
      );
      expect(out).toBe("not-a-url");
    });
  });

  describe("normalizeSections", () => {
    it("flattens single-child wrapper sections without text content", () => {
      const doc = makeDoc(
        `<article><section><section><p>real content</p></section></section></article>`
      );
      const flattened = globalThis.PineSnapCapture.domCleanup!.normalizeSections(doc);
      expect(flattened).toBeGreaterThanOrEqual(1);
      const sections = doc.querySelectorAll("section");
      expect(sections.length).toBeLessThan(2);
      expect(doc.querySelector("p")?.textContent).toBe("real content");
    });

    it("does not flatten section with own text content", () => {
      const doc = makeDoc(
        `<section>direct text<section><p>x</p></section></section>`
      );
      globalThis.PineSnapCapture.domCleanup!.normalizeSections(doc);
      expect(doc.querySelectorAll("section")).toHaveLength(2);
    });
  });
});
