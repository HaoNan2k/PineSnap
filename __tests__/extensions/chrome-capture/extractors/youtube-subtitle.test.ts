import { describe, it, expect, beforeEach } from "vitest";
import { loadExtensionScript, resetCaptureGlobal } from "../test-utils";
import type {} from "../types";

interface YoutubeExtractor {
  provider: string;
  matches: (url: string) => boolean;
  extract: (ctx: {
    url: string;
    document: Document;
    fetchJson: (url: string, options?: { responseType?: string }) => Promise<unknown>;
  }) => Promise<{
    ok: boolean;
    provider: string;
    code?: string;
    payload?: {
      sourceType: string;
      artifact: { kind: string; format: string; content: { transcript: { lines: unknown[] } } };
      metadata: { platform: string; captureDiagnostics: Record<string, unknown> };
    };
  }>;
}

interface YoutubeInternals {
  readInitialPlayerResponse: (doc: Document) => unknown;
  getCaptionTracks: (resp: unknown) => Array<{
    baseUrl: string;
    languageCode?: string;
    kind?: string;
    name?: string;
  }>;
  chooseTrack: (
    tracks: Array<{ baseUrl: string; languageCode?: string; kind?: string }>
  ) => { baseUrl: string; languageCode?: string; kind?: string } | null;
  parseTimedTextXml: (xml: string) => Array<{ startMs: number; text: string }>;
  videoIdFromUrl: (url: string) => string | undefined;
}

function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function pageWithPlayerResponse(playerResponse: object): Document {
  return makeDoc(`
    <html>
      <head><title>YouTube Page</title></head>
      <body>
        <script>
          var ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};
        </script>
      </body>
    </html>
  `);
}

describe("youtube-subtitle extractor", () => {
  beforeEach(() => {
    resetCaptureGlobal();
    loadExtensionScript("shared/runtime.js");
    loadExtensionScript("shared/extractors/youtube-subtitle.js");
    loadExtensionScript("shared/extractor-registry.js");
  });

  function getExtractor(): YoutubeExtractor {
    return globalThis.PineSnapCapture.extractors!
      .youtube_subtitle_v1 as unknown as YoutubeExtractor;
  }

  function getInternals(): YoutubeInternals {
    return globalThis.PineSnapCapture.extractors!.youtube_subtitle_v1
      ._internals as unknown as YoutubeInternals;
  }

  describe("matches", () => {
    it("matches youtube.com/watch URLs", () => {
      const ext = getExtractor();
      expect(ext.matches("https://www.youtube.com/watch?v=abc123")).toBe(true);
      expect(ext.matches("https://youtube.com/watch?v=abc")).toBe(true);
    });

    it("does not match other URLs", () => {
      const ext = getExtractor();
      expect(ext.matches("https://www.youtube.com/")).toBe(false);
      expect(ext.matches("https://www.bilibili.com/video/BV1")).toBe(false);
    });
  });

  describe("readInitialPlayerResponse", () => {
    it("parses ytInitialPlayerResponse JSON from inline script", () => {
      const doc = pageWithPlayerResponse({ videoDetails: { videoId: "abc" } });
      const internals = getInternals();
      const parsed = internals.readInitialPlayerResponse(doc) as {
        videoDetails: { videoId: string };
      };
      expect(parsed.videoDetails.videoId).toBe("abc");
    });

    it("returns null when no script contains ytInitialPlayerResponse", () => {
      const doc = makeDoc("<html><body><script>var x = 1;</script></body></html>");
      const internals = getInternals();
      expect(internals.readInitialPlayerResponse(doc)).toBeNull();
    });
  });

  describe("chooseTrack", () => {
    it("prefers manual zh > zh-CN > zh > en > asr zh > asr en > first", () => {
      const internals = getInternals();
      const tracks = [
        { baseUrl: "u-asr-zh", languageCode: "zh", kind: "asr" },
        { baseUrl: "u-en", languageCode: "en", kind: undefined },
        { baseUrl: "u-zh-cn", languageCode: "zh-CN", kind: undefined },
        { baseUrl: "u-zh-hans", languageCode: "zh-Hans", kind: undefined },
      ];
      const chosen = internals.chooseTrack(tracks);
      expect(chosen?.baseUrl).toBe("u-zh-hans");
    });

    it("falls back to first when no preferred languages", () => {
      const internals = getInternals();
      const tracks = [{ baseUrl: "u-fr", languageCode: "fr", kind: undefined }];
      expect(internals.chooseTrack(tracks)?.baseUrl).toBe("u-fr");
    });
  });

  describe("parseTimedTextXml", () => {
    it("converts <text> nodes to {startMs, text} lines", () => {
      const internals = getInternals();
      const xml = `<?xml version="1.0"?>
<transcript>
  <text start="0.5" dur="2.0">Hello world</text>
  <text start="3.0" dur="2.0">Second line</text>
  <text start="3.0" dur="2.0">Second line</text>
</transcript>`;
      const lines = internals.parseTimedTextXml(xml);
      expect(lines).toHaveLength(2); // dedup by (startMs|text)
      expect(lines[0]).toMatchObject({ startMs: 500, text: "Hello world" });
      expect(lines[1]).toMatchObject({ startMs: 3000, text: "Second line" });
    });

    it("decodes HTML entities", () => {
      const internals = getInternals();
      const xml = `<text start="0">A &amp; B</text>`;
      const lines = internals.parseTimedTextXml(xml);
      expect(lines[0].text).toBe("A & B");
    });
  });

  describe("extract", () => {
    it("returns NO_SUBTITLE_TRACK when player response has no captions", async () => {
      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://www.youtube.com/watch?v=nocc",
        document: pageWithPlayerResponse({
          videoDetails: { videoId: "nocc", title: "no captions" },
          captions: {},
        }),
        fetchJson: async () => "",
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("NO_SUBTITLE_TRACK");
    });

    it("returns MISSING_VIDEO_CONTEXT when no ytInitialPlayerResponse", async () => {
      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://www.youtube.com/watch?v=x",
        document: makeDoc("<html><body></body></html>"),
        fetchJson: async () => "",
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("MISSING_VIDEO_CONTEXT");
    });

    it("emits official_subtitle artifact on happy path", async () => {
      const ext = getExtractor();
      const xmlResponse = `<?xml version="1.0"?>
<transcript>
  <text start="0">Line one</text>
  <text start="2">Line two</text>
</transcript>`;
      const result = await ext.extract({
        url: "https://www.youtube.com/watch?v=happy",
        document: pageWithPlayerResponse({
          videoDetails: {
            videoId: "happy",
            title: "Happy Video",
            channelId: "UC123",
            author: "Some Channel",
            lengthSeconds: "120",
          },
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [
                {
                  baseUrl: "https://www.youtube.com/api/timedtext?v=happy",
                  languageCode: "en",
                  name: { simpleText: "English" },
                },
              ],
            },
          },
        }),
        fetchJson: async () => xmlResponse,
      });

      expect(result.ok).toBe(true);
      expect(result.payload?.sourceType).toBe("youtube");
      expect(result.payload?.artifact.kind).toBe("official_subtitle");
      expect(result.payload?.artifact.format).toBe("cue_lines");
      expect(result.payload?.artifact.content.transcript.lines).toHaveLength(2);
      expect(result.payload?.metadata.platform).toBe("youtube");
      const diag = result.payload?.metadata.captureDiagnostics as {
        provider: string;
        videoId: string;
        lineCount: number;
      };
      expect(diag.provider).toBe("youtube_subtitle_v1");
      expect(diag.videoId).toBe("happy");
      expect(diag.lineCount).toBe(2);
    });

    it("returns SUBTITLE_FETCH_FAILED when timedtext returns empty", async () => {
      const ext = getExtractor();
      const result = await ext.extract({
        url: "https://www.youtube.com/watch?v=empty",
        document: pageWithPlayerResponse({
          videoDetails: { videoId: "empty" },
          captions: {
            playerCaptionsTracklistRenderer: {
              captionTracks: [
                {
                  baseUrl: "https://www.youtube.com/api/timedtext?v=empty",
                  languageCode: "en",
                },
              ],
            },
          },
        }),
        fetchJson: async () => "",
      });
      expect(result.ok).toBe(false);
      expect(result.code).toBe("SUBTITLE_FETCH_FAILED");
    });
  });
});
