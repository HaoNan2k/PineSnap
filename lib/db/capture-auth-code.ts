import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

const DEFAULT_CODE_TTL_SECONDS = 300;

function hashAuthCode(code: string): string {
  return createHash("sha256").update(code, "utf8").digest("hex");
}

function buildCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier, "utf8").digest("base64url");
}

function generateAuthCode(): string {
  return `pscap_auth_v1_${randomBytes(24).toString("base64url")}`;
}

function secureStringEqual(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left, "utf8");
  const rightBuf = Buffer.from(right, "utf8");
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

export async function createCaptureAuthCode(args: {
  userId: string;
  codeChallenge: string;
  state: string;
  redirectUri: string;
  ttlSeconds?: number;
}): Promise<{ code: string; expiresAt: Date }> {
  const ttlSeconds = args.ttlSeconds ?? DEFAULT_CODE_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateAuthCode();
    const codeHash = hashAuthCode(code);

    try {
      await prisma.captureAuthCode.create({
        data: {
          userId: args.userId,
          codeHash,
          codeChallenge: args.codeChallenge,
          state: args.state,
          redirectUri: args.redirectUri,
          expiresAt,
        },
      });
      return { code, expiresAt };
    } catch {
      continue;
    }
  }

  throw new Error("Failed to generate authorization code");
}

export async function consumeCaptureAuthCode(args: {
  code: string;
  codeVerifier: string;
  state: string;
  redirectUri: string;
}): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: 400 | 401; code: "invalid_request" | "invalid_grant" }
> {
  const codeHash = hashAuthCode(args.code);
  const record = await prisma.captureAuthCode.findUnique({
    where: { codeHash },
    select: {
      id: true,
      userId: true,
      state: true,
      redirectUri: true,
      codeChallenge: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (!record) return { ok: false, status: 401, code: "invalid_grant" };
  if (record.consumedAt) return { ok: false, status: 401, code: "invalid_grant" };
  if (record.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 401, code: "invalid_grant" };
  }

  if (!secureStringEqual(record.state, args.state)) {
    return { ok: false, status: 400, code: "invalid_request" };
  }
  if (!secureStringEqual(record.redirectUri, args.redirectUri)) {
    return { ok: false, status: 400, code: "invalid_request" };
  }

  const expectedChallenge = buildCodeChallenge(args.codeVerifier);
  if (!secureStringEqual(record.codeChallenge, expectedChallenge)) {
    return { ok: false, status: 401, code: "invalid_grant" };
  }

  const updateResult = await prisma.captureAuthCode.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (updateResult.count !== 1) {
    return { ok: false, status: 401, code: "invalid_grant" };
  }

  return { ok: true, userId: record.userId };
}

