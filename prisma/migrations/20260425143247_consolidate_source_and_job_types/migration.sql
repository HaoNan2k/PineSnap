-- Consolidate Capture enums (Phase C of generalize-capture-extension)
--
-- Drops:
--   CaptureSourceType: wechat_article, xiaohongshu  (covered by web_page + providerContext.webPage.extractor)
--   CaptureJobType:    article_extract              (semantic dup of web_extract)
--
-- Pre-flight (must be 0 before this migration runs):
--   SELECT count(*) FROM "Resource"   WHERE "sourceType" IN ('wechat_article','xiaohongshu');
--   SELECT count(*) FROM "CaptureJob" WHERE "sourceType" IN ('wechat_article','xiaohongshu')
--                                        OR "jobType"    = 'article_extract';
--
-- Postgres < 17 cannot DROP a value from an enum, so we use the standard
-- rename-old / create-new / cast-columns / drop-old dance. If any row still
-- holds a removed value, the cast fails and the whole migration aborts —
-- that's the safety net.

-- ─────────────────────────────────────────────────────────────────
-- 1. CaptureSourceType
-- ─────────────────────────────────────────────────────────────────

ALTER TYPE "CaptureSourceType" RENAME TO "CaptureSourceType_old";

CREATE TYPE "CaptureSourceType" AS ENUM (
  'bilibili',
  'web_page',
  'youtube',
  'douyin'
);

ALTER TABLE "Resource"
  ALTER COLUMN "sourceType" DROP DEFAULT,
  ALTER COLUMN "sourceType" TYPE "CaptureSourceType"
    USING "sourceType"::text::"CaptureSourceType",
  ALTER COLUMN "sourceType" SET DEFAULT 'bilibili';

ALTER TABLE "CaptureJob"
  ALTER COLUMN "sourceType" TYPE "CaptureSourceType"
    USING "sourceType"::text::"CaptureSourceType";

DROP TYPE "CaptureSourceType_old";

-- ─────────────────────────────────────────────────────────────────
-- 2. CaptureJobType
-- ─────────────────────────────────────────────────────────────────

ALTER TYPE "CaptureJobType" RENAME TO "CaptureJobType_old";

CREATE TYPE "CaptureJobType" AS ENUM (
  'subtitle_fetch',
  'audio_transcribe',
  'web_extract',
  'summary_generate',
  'media_ingest'
);

ALTER TABLE "CaptureJob"
  ALTER COLUMN "jobType" TYPE "CaptureJobType"
    USING "jobType"::text::"CaptureJobType";

DROP TYPE "CaptureJobType_old";
