import { createHash } from "crypto";
import { z } from "zod";

// Phase C：归并到最小集
//   - wechat_article / xiaohongshu → web_page + providerContext.webPage.extractor
//   - article_extract → web_extract（语义重叠，原本无运行时区分）
export const captureSourceTypeSchema = z.enum([
  "bilibili",
  "web_page",
  "youtube",
  "douyin",
]);

export const captureJobTypeSchema = z.enum([
  "subtitle_fetch",
  "audio_transcribe",
  "web_extract",
  "summary_generate",
  "media_ingest",
]);

// providerContext.webPage.extractor 取值 = 扩展端 SITE_ADAPTERS 注册的 provider id
export const webPageExtractorSchema = z.enum([
  "generic_article_v1",
  "wechat_article_v1",
  "zhihu_answer_v1",
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

const webPageProviderContextSchema = z
  .object({
    titleHint: z.string().min(1).optional(),
    selectorHints: z.array(z.string().min(1)).optional(),
    // Phase C：扩展端 SITE_ADAPTERS 命中的 provider id，下游按这个区分公众号 / 知乎 / 通用文章
    extractor: webPageExtractorSchema.optional(),
  })
  .optional();

const douyinProviderContextSchema = z
  .object({
    awemeId: z.string().min(1).optional(),
    secUid: z.string().min(1).optional(),
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
      webPage: webPageProviderContextSchema,
      douyin: douyinProviderContextSchema,
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

export function inferJobTypeFromSource(sourceType: CaptureSourceType): CaptureJobType {
  if (sourceType === "bilibili" || sourceType === "youtube" || sourceType === "douyin") {
    return "audio_transcribe";
  }
  // 包含 web_page 与未来新增的非视频源
  return "web_extract";
}
