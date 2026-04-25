import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

import { requireEnv } from "@/lib/env";

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

type ArtifactTokenPayload = {
  summaryId: string;
  userId: string;
  exp: number;
};

function getSecret(): string {
  return requireEnv("ARTIFACT_TOKEN_SECRET");
}

function base64urlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLen), "base64").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signArtifactToken({
  summaryId,
  userId,
  ttlSeconds = DEFAULT_TTL_SECONDS,
}: {
  summaryId: string;
  userId: string;
  ttlSeconds?: number;
}): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload: ArtifactTokenPayload = { summaryId, userId, exp };
  const encoded = base64urlEncode(JSON.stringify(payload));
  const signature = sign(encoded, getSecret());
  return `${encoded}.${signature}`;
}

export function verifyArtifactToken(
  token: string,
  expectedSummaryId: string
): ArtifactTokenPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(encoded, getSecret());
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: ArtifactTokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(encoded)) as ArtifactTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof payload.summaryId !== "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  if (payload.summaryId !== expectedSummaryId) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
