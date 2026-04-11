-- DropForeignKey
ALTER TABLE "CaptureArtifact" DROP CONSTRAINT "CaptureArtifact_resourceId_fkey";

-- DropIndex
DROP INDEX "CaptureArtifact_resourceId_createdAt_idx";

-- DropIndex
DROP INDEX "CaptureArtifact_resourceId_kind_language_isPrimary_idx";

-- DropIndex
DROP INDEX "CaptureJob_userId_idx";

-- DropIndex
DROP INDEX "CaptureJob_userId_sourceType_captureRequestId_key";

-- DropIndex
DROP INDEX "Resource_type_externalId_idx";

-- AlterTable
ALTER TABLE "CaptureArtifact" DROP COLUMN "resourceId",
ADD COLUMN     "schemaVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "CaptureJob" DROP COLUMN "userId",
ALTER COLUMN "jobType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "content";

-- AlterTable
ALTER TABLE "Resource" DROP COLUMN "content",
DROP COLUMN "externalId",
DROP COLUMN "sourceUrl",
DROP COLUMN "type",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "thumbnailUrl" TEXT,
ALTER COLUMN "canonicalUrl" SET NOT NULL;

-- CreateIndex
CREATE INDEX "CaptureArtifact_jobId_kind_language_isPrimary_idx" ON "CaptureArtifact"("jobId", "kind", "language", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureJob_resourceId_captureRequestId_key" ON "CaptureJob"("resourceId", "captureRequestId");

-- AddForeignKey
ALTER TABLE "CaptureJob" ADD CONSTRAINT "CaptureJob_supersededByJobId_fkey" FOREIGN KEY ("supersededByJobId") REFERENCES "CaptureJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
