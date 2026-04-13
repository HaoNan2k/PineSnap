-- Add CaptureJob typing dimensions

CREATE TYPE "CaptureJobType" AS ENUM (
  'subtitle_fetch',
  'audio_transcribe',
  'web_extract',
  'article_extract',
  'summary_generate',
  'media_ingest'
);

CREATE TYPE "CaptureExecutionMode" AS ENUM ('INLINE', 'ASYNC');

ALTER TABLE "CaptureJob"
ADD COLUMN "jobType" "CaptureJobType" NOT NULL DEFAULT 'subtitle_fetch',
ADD COLUMN "executionMode" "CaptureExecutionMode" NOT NULL DEFAULT 'ASYNC';
