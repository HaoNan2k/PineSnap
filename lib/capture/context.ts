import { createHash } from "crypto";
import { z } from "zod";

export const captureSourceTypeSchema = z.enum([
  "bilibili",
  "wechat_article",
  "web_page",
  "youtube",
  "xiaohongshu",
]);

export const captureJobTypeSchema = z.enum([
  "subtitle_fetch",
  "audio_transcribe",
  "web_extract",
  "article_extract",
  "summary_generate",
  "media_ingest",
]);

const accessContextSchema = z
  .object({
    referer: z.string().url().optional(),
    userAgent: z.string().min(1).max(1000).optional(),
  })
  .optional();

const mediaCandidateSchema = z.object({
  kind: z.enum(["audio", "video"]).default("audio"),
  url: z.string().url(),
  mimeType: z.string().min(1).optional(),
  bitrateKbps: z.number().positive().optional(),
  durationSec: z.number().positive().optional(),
});

const bilibiliProviderContextSchema = z
  .object({
    bvid: z.string().min(1).optional(),
    aid: z.union([z.string().min(1), z.number().int().positive()]).optional(),
    cid: z.number().int().positive().optional(),
    p: z.number().int().positive().optional(),
  })
  .optional();

const youtubeProviderContextSchema = z
  .object({
    videoId: z.string().min(1).optional(),
    channelId: z.string().min(1).optional(),
    playlistId: z.string().min(1).optional(),
  })
  .optional();

const wechatArticleProviderContextSchema = z
  .object({
    biz: z.string().min(1).optional(),
    mid: z.string().min(1).optional(),
    idx: z.string().min(1).optional(),
    sn: z.string().min(1).optional(),
  })
  .optional();

const webPageProviderContextSchema = z
  .object({
    titleHint: z.string().min(1).optional(),
    selectorHints: z.array(z.string().min(1)).optional(),
  })
  .optional();

const xiaohongshuProviderContextSchema = z
  .object({
    noteId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
  })
  .optional();

export const captureContextSchema = z.object({
  schemaVersion: z.number().int().positive().default(1),
  sourceType: captureSourceTypeSchema,
  sourceUrl: z.string().url(),
  canonicalUrl: z.string().url().optional(),
  captureRequestId: z.string().min(8).max(200),
  capturedAt: z.string().datetime(),
  accessContext: accessContextSchema,
  mediaCandidates: z.array(mediaCandidateSchema).optional(),
  providerContext: z
    .object({
      bilibili: bilibiliProviderContextSchema,
      youtube: youtubeProviderContextSchema,
      wechatArticle: wechatArticleProviderContextSchema,
      webPage: webPageProviderContextSchema,
      xiaohongshu: xiaohongshuProviderContextSchema,
    })
    .optional(),
});

export type CaptureContext = z.infer<typeof captureContextSchema>;
export type CaptureSourceType = z.infer<typeof captureSourceTypeSchema>;
export type CaptureJobType = z.infer<typeof captureJobTypeSchema>;

export function normalizeCanonicalUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  const removable = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  for (const key of removable) {
    parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

export function buildSourceFingerprint(sourceType: CaptureSourceType, canonicalUrl: string): string {
  const normalized = `${sourceType}:${canonicalUrl}`;
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function requiredCaptureScope(sourceType: CaptureSourceType): `capture:${string}` {
  return `capture:${sourceType}`;
}

export function inferResourceType(sourceType: CaptureSourceType): string {
  return `${sourceType}_capture`;
}

export function inferJobTypeFromSource(sourceType: CaptureSourceType): CaptureJobType {
  if (sourceType === "bilibili" || sourceType === "youtube") return "subtitle_fetch";
  if (sourceType === "wechat_article") return "article_extract";
  if (sourceType === "web_page") return "web_extract";
  if (sourceType === "xiaohongshu") return "media_ingest";
  return "web_extract";
}
