-- Add CaptureToken for cross-origin capture (Userscript) authentication
CREATE TABLE "CaptureToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CaptureToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaptureToken_tokenHash_key" ON "CaptureToken"("tokenHash");
CREATE INDEX "CaptureToken_userId_idx" ON "CaptureToken"("userId");

