-- Add Resource for structured content ingestion (capture → resource)
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "externalId" TEXT,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Resource_userId_idx" ON "Resource"("userId");
CREATE INDEX "Resource_type_externalId_idx" ON "Resource"("type", "externalId");

