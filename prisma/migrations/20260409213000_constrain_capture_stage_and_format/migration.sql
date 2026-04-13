-- Constrain stage/format fields with enums

CREATE TYPE "CaptureJobStage" AS ENUM (
  'QUEUED',
  'CLAIMED',
  'PERSISTING_ARTIFACT',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'IMPORTED'
);

CREATE TYPE "CaptureArtifactFormat" AS ENUM (
  'cue_lines',
  'json',
  'plain_text',
  'markdown',
  'binary_ref'
);

ALTER TABLE "CaptureJob"
ALTER COLUMN "stage" TYPE "CaptureJobStage"
USING (
  CASE
    WHEN "stage" = 'queued' THEN 'QUEUED'::"CaptureJobStage"
    WHEN "stage" = 'claimed' THEN 'CLAIMED'::"CaptureJobStage"
    WHEN "stage" = 'persisting_artifact' THEN 'PERSISTING_ARTIFACT'::"CaptureJobStage"
    WHEN "stage" = 'completed' THEN 'COMPLETED'::"CaptureJobStage"
    WHEN "stage" = 'failed' THEN 'FAILED'::"CaptureJobStage"
    WHEN "stage" = 'migrated_legacy' THEN 'IMPORTED'::"CaptureJobStage"
    ELSE NULL
  END
);

ALTER TABLE "CaptureArtifact"
ALTER COLUMN "format" TYPE "CaptureArtifactFormat"
USING (
  CASE
    WHEN "format" = 'cue_lines' THEN 'cue_lines'::"CaptureArtifactFormat"
    WHEN "format" = 'json' THEN 'json'::"CaptureArtifactFormat"
    WHEN "format" = 'plain_text' THEN 'plain_text'::"CaptureArtifactFormat"
    WHEN "format" = 'markdown' THEN 'markdown'::"CaptureArtifactFormat"
    WHEN "format" = 'binary_ref' THEN 'binary_ref'::"CaptureArtifactFormat"
    ELSE NULL
  END
);
