-- Multi-source capture model: Resource + CaptureJob + CaptureArtifact

-- Enums
CREATE TYPE "CaptureSourceType" AS ENUM ('bilibili', 'wechat_article', 'web_page', 'youtube', 'xiaohongshu');
CREATE TYPE "CaptureJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "CaptureArtifactKind" AS ENUM ('official_subtitle', 'asr_transcript', 'summary', 'extracted_text');

-- Resource extensions
ALTER TABLE "Resource"
ADD COLUMN "sourceType" "CaptureSourceType" NOT NULL DEFAULT 'bilibili',
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "canonicalUrl" TEXT,
ADD COLUMN "sourceFingerprint" TEXT;

CREATE INDEX "Resource_userId_sourceType_idx" ON "Resource"("userId", "sourceType");
CREATE INDEX "Resource_userId_sourceFingerprint_idx" ON "Resource"("userId", "sourceFingerprint");

-- CaptureJob
CREATE TABLE "CaptureJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "sourceType" "CaptureSourceType" NOT NULL,
    "captureRequestId" TEXT NOT NULL,
    "status" "CaptureJobStatus" NOT NULL DEFAULT 'PENDING',
    "stage" TEXT,
    "inputContext" JSONB NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "superseded" BOOLEAN NOT NULL DEFAULT false,
    "supersededByJobId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaptureJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaptureJob_userId_idx" ON "CaptureJob"("userId");
CREATE INDEX "CaptureJob_resourceId_createdAt_idx" ON "CaptureJob"("resourceId", "createdAt");
CREATE INDEX "CaptureJob_resourceId_superseded_createdAt_idx" ON "CaptureJob"("resourceId", "superseded", "createdAt");
CREATE UNIQUE INDEX "CaptureJob_userId_sourceType_captureRequestId_key" ON "CaptureJob"("userId", "sourceType", "captureRequestId");

-- CaptureArtifact
CREATE TABLE "CaptureArtifact" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "kind" "CaptureArtifactKind" NOT NULL,
    "language" TEXT,
    "format" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "qualityScore" DOUBLE PRECISION,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureArtifact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaptureArtifact_resourceId_createdAt_idx" ON "CaptureArtifact"("resourceId", "createdAt");
CREATE INDEX "CaptureArtifact_jobId_createdAt_idx" ON "CaptureArtifact"("jobId", "createdAt");
CREATE INDEX "CaptureArtifact_resourceId_kind_language_isPrimary_idx" ON "CaptureArtifact"("resourceId", "kind", "language", "isPrimary");

-- Ensure only one primary artifact per resource+kind+language
CREATE UNIQUE INDEX "CaptureArtifact_primary_unique_idx"
ON "CaptureArtifact" ("resourceId", "kind", COALESCE("language", ''))
WHERE "isPrimary" = true;

-- FKs
ALTER TABLE "CaptureJob"
ADD CONSTRAINT "CaptureJob_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CaptureArtifact"
ADD CONSTRAINT "CaptureArtifact_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CaptureArtifact"
ADD CONSTRAINT "CaptureArtifact_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "CaptureJob"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
