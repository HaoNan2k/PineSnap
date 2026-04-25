-- Drop legacy v1 ResourceSummary (artifact-style HTML, multi-version per resource).
-- v1 data is intentionally discarded — see decisions/0005-resource-summary-as-document.md.
DROP TABLE IF EXISTS "ResourceSummary";

-- Recreate as v2: 1:1 with Resource, structured markdown + keyMoments.
CREATE TABLE "ResourceSummary" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "oneLineSummary" TEXT NOT NULL,
    "keyMoments" JSONB NOT NULL DEFAULT '[]',
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceSummary_pkey" PRIMARY KEY ("id")
);

-- One summary per resource.
CREATE UNIQUE INDEX "ResourceSummary_resourceId_key" ON "ResourceSummary"("resourceId");

CREATE INDEX "ResourceSummary_userId_generatedAt_idx" ON "ResourceSummary"("userId", "generatedAt");

ALTER TABLE "ResourceSummary" ADD CONSTRAINT "ResourceSummary_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
