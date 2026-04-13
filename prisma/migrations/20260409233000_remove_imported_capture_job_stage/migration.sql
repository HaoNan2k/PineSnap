-- Remove historical IMPORTED stage from CaptureJobStage enum.
UPDATE "CaptureJob"
SET "stage" = 'COMPLETED'
WHERE "stage" = 'IMPORTED';

ALTER TYPE "CaptureJobStage" RENAME TO "CaptureJobStage_old";

CREATE TYPE "CaptureJobStage" AS ENUM (
  'QUEUED',
  'CLAIMED',
  'PERSISTING_ARTIFACT',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

ALTER TABLE "CaptureJob"
  ALTER COLUMN "stage" TYPE "CaptureJobStage"
  USING ("stage"::text::"CaptureJobStage");

DROP TYPE "CaptureJobStage_old";
