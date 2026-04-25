-- CreateTable
CREATE TABLE "ResourceSummary" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceSummary_resourceId_generatedAt_idx" ON "ResourceSummary"("resourceId", "generatedAt");

-- CreateIndex
CREATE INDEX "ResourceSummary_userId_generatedAt_idx" ON "ResourceSummary"("userId", "generatedAt");

-- AddForeignKey
ALTER TABLE "ResourceSummary" ADD CONSTRAINT "ResourceSummary_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
