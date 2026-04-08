-- Add one-time authorization codes for extension token exchange
CREATE TABLE "CaptureAuthCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureAuthCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CaptureAuthCode_codeHash_key" ON "CaptureAuthCode"("codeHash");
CREATE INDEX "CaptureAuthCode_userId_idx" ON "CaptureAuthCode"("userId");
CREATE INDEX "CaptureAuthCode_expiresAt_idx" ON "CaptureAuthCode"("expiresAt");

