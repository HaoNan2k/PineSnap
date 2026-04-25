import { describe, it, expect, beforeEach } from "vitest";
import {
  loadExtensionScript,
  resetCaptureGlobal,
  loadFixtureDocument,
} from "../test-utils";
import type {} from "../types";

interface BilibiliInternals {
  getVideoContext: (
    doc: Document,
    urlOverride?: string
  ) => {
    url: string;
    page: number;
    bvid?: string;
    title: string;
    id?: string;
    initialState: unknown;
    playinfo: unknown;
  };
  buildSubtitlePayload: (
    video: unknown,
    result: unknown
  ) => {
    version: number;
    sourceType: string;
    artifact: { kind: string; format: string; isPrimary: boolean; content: unknown };
    metadata: { platform: string; captureDiagnostics: Record<string, unknown> };
  };
  buildAsrFallbackPayload: (
    video: unknown,
    code: string,
    attempts: unknown[]
  ) => {
    version: number;
    sourceType: string;
    mediaCandidates: unknown[];
    metadata: {
      captureDiagnostics: { asrFallback: boolean; subtitleFailCode: string };
    };
  };
  extractMediaCandidates: (playinfo: unknown) => Array<{
    kind: string;
    url: string;
    mimeType: string;
    bitrateKbps?: number;
  }>;
}

function bilibiliInternals(): BilibiliInternals {
  return globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1
    ._internals as unknown as BilibiliInternals;
}

describe("bilibili-full-subtitle extractor", () => {
  beforeEach(() => {
    resetCaptureGlobal();
    loadExtensionScript("shared/runtime.js");
    loadExtensionScript("shared/extractors/bilibili-full-subtitle.js");
  });

  describe("registration & matches", () => {
    it("registers under bilibili_full_subtitle_v1", () => {
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      expect(ext).toBeDefined();
      expect(ext.provider).toBe("bilibili_full_subtitle_v1");
    });

    it("matches B 站 video URLs only", () => {
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      expect(ext.matches("https://www.bilibili.com/video/BV1xx411c7mD")).toBe(true);
      expect(ext.matches("https://www.bilibili.com/video/BV1234?p=2")).toBe(true);
      expect(ext.matches("https://www.bilibili.com/")).toBe(false);
      expect(ext.matches("https://www.youtube.com/watch?v=x")).toBe(false);
      expect(ext.matches("https://example.com/video/BVxxx")).toBe(false);
    });

    it("exposes _internals for content.js fallback decision", () => {
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      expect(typeof bilibiliInternals().getVideoContext).toBe("function");
      expect(typeof bilibiliInternals().buildSubtitlePayload).toBe("function");
      expect(typeof bilibiliInternals().buildAsrFallbackPayload).toBe("function");
      expect(typeof bilibiliInternals().extractMediaCandidates).toBe("function");
    });
  });

  describe("buildSubtitlePayload", () => {
    it("produces video-shape artifact with official_subtitle kind", () => {
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      const video = {
        id: "BV1xx411c7mD",
        url: "https://www.bilibili.com/video/BV1xx411c7mD",
        title: "测试视频",
      };
      const result = {
        provider: "bilibili_full_subtitle_v1",
        content: {
          transcript: {
            provider: "bilibili_full_subtitle_v1",
            language: "zh-CN",
            lines: [
              { startMs: 0, startLabel: "00:00", text: "你好" },
              { startMs: 1500, startLabel: "00:01", text: "世界" },
            ],
          },
          summary: { chapters: [{ title: "intro", startMs: 0 }] },
        },
        diagnostics: { lineCount: 2, selectedLanguage: "zh-CN" },
      };
      const payload = bilibiliInternals().buildSubtitlePayload(video, result);
      expect(payload.version).toBe(1);
      expect(payload.sourceType).toBe("bilibili");
      expect(payload.artifact.kind).toBe("official_subtitle");
      expect(payload.artifact.format).toBe("cue_lines");
      expect(payload.artifact.isPrimary).toBe(true);
      expect(payload.metadata.platform).toBe("bilibili");
      expect((payload.metadata.captureDiagnostics as { transcriptLineCount: number }).transcriptLineCount).toBe(2);
      expect((payload.metadata.captureDiagnostics as { summaryChapterCount: number }).summaryChapterCount).toBe(1);
    });
  });

  describe("buildAsrFallbackPayload", () => {
    it("produces a no-artifact payload with mediaCandidates for ASR worker", () => {
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      const video = {
        id: "BV1xx",
        url: "https://www.bilibili.com/video/BV1xx",
        title: "no-cc video",
        playinfo: {
          data: {
            dash: {
              audio: [
                {
                  baseUrl: "https://cdn.example.com/audio.m4a",
                  bandwidth: 128000,
                  mimeType: "audio/mp4",
                },
              ],
            },
          },
        },
      };
      const payload = bilibiliInternals().buildAsrFallbackPayload(
        video,
        "NO_SUBTITLE_TRACK",
        [{ provider: "bilibili_full_subtitle_v1", ok: false, code: "NO_SUBTITLE_TRACK" }]
      );
      expect(payload.version).toBe(1);
      expect(payload.sourceType).toBe("bilibili");
      // 不带 artifact，让服务端把 jobType 推断为 audio_transcribe 进队列
      expect((payload as Record<string, unknown>).artifact).toBeUndefined();
      expect(payload.mediaCandidates).toHaveLength(1);
      expect(payload.metadata.captureDiagnostics.asrFallback).toBe(true);
      expect(payload.metadata.captureDiagnostics.subtitleFailCode).toBe(
        "NO_SUBTITLE_TRACK"
      );
    });

    it("returns empty mediaCandidates when playinfo missing audio", () => {
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      const payload = bilibiliInternals().buildAsrFallbackPayload(
        { id: "BV1", url: "https://www.bilibili.com/video/BV1", title: "x", playinfo: null },
        "NO_SUBTITLE_TRACK",
        []
      );
      expect(payload.mediaCandidates).toEqual([]);
    });
  });

  describe("extractMediaCandidates", () => {
    it("normalizes baseUrl/base_url field variance", () => {
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      const candidates = bilibiliInternals().extractMediaCandidates({
        data: {
          dash: {
            audio: [
              { baseUrl: "https://a.example.com/x.m4a", bandwidth: 64000, mimeType: "audio/mp4" },
              { base_url: "https://a.example.com/y.m4a", bandwidth: 192000, mime_type: "audio/mp4" },
            ],
          },
        },
      }) as Array<{ url: string; bitrateKbps: number; mimeType: string; kind: string }>;
      expect(candidates).toHaveLength(2);
      expect(candidates[0].url).toBe("https://a.example.com/x.m4a");
      expect(candidates[0].bitrateKbps).toBe(64);
      expect(candidates[1].url).toBe("https://a.example.com/y.m4a");
      expect(candidates[1].bitrateKbps).toBe(192);
      expect(candidates[0].kind).toBe("audio");
    });

    it("returns [] for missing playinfo or empty audio array", () => {
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      expect(bilibiliInternals().extractMediaCandidates(null)).toEqual([]);
      expect(bilibiliInternals().extractMediaCandidates({})).toEqual([]);
      expect(bilibiliInternals().extractMediaCandidates({ data: { dash: { audio: [] } } })).toEqual([]);
    });
  });

  describe("getVideoContext (with optional fixture)", () => {
    it("[skipped if no fixture] parses real B 站 video page", () => {
      const doc = loadFixtureDocument("bilibili-single-p.html");
      if (!doc) {
        console.info(
          "[bilibili.test] fixture bilibili-single-p.html missing — skip real-page parsing assertion. See __tests__/extensions/chrome-capture/fixtures/README.md"
        );
        return;
      }
      const ext = globalThis.PineSnapCapture.extractors!.bilibili_full_subtitle_v1;
      const video = bilibiliInternals().getVideoContext(
        doc,
        "https://www.bilibili.com/video/BVxxxxxxxxxx"
      );
      expect(video.bvid).toMatch(/^BV[0-9A-Za-z]+$/);
      expect(video.title.length).toBeGreaterThan(0);
      expect(video.page).toBeGreaterThanOrEqual(1);
    });
  });
});
