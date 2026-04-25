import "server-only";

import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";

export type CaptureTokenScope = `capture:${string}`;

export function tokenHasScope(scopes: string[], requiredScope: string): boolean {
  if (scopes.includes(requiredScope)) return true;
  return scopes.includes("capture:*");
}

export type CaptureTokenPublic = {
  id: string;
  label: string | null;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export function hashCaptureToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function generatePlainCaptureToken(): string {
  const raw = randomBytes(32).toString("base64url");
  return `pscap_v1_${raw}`;
}

export async function listCaptureTokens(userId: string): Promise<CaptureTokenPublic[]> {
  return prisma.captureToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });
}

export async function createCaptureToken(args: {
  userId: string;
  label?: string;
  scopes: CaptureTokenScope[];
}): Promise<{ token: string; record: CaptureTokenPublic }> {
  const { userId, label, scopes } = args;

  // Extremely low collision probability; retry makes it deterministic.
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generatePlainCaptureToken();
    const tokenHash = hashCaptureToken(token);

    try {
      const created = await prisma.captureToken.create({
        data: {
          userId,
          label: label ?? null,
          tokenHash,
          scopes,
        },
        select: {
          id: true,
          label: true,
          scopes: true,
          createdAt: true,
          lastUsedAt: true,
          revokedAt: true,
        },
      });

      return { token, record: created };
    } catch {
      // If unique constraint fails, retry.
      // Prisma error codes are not stable across adapters here; best-effort retry only.
      continue;
    }
  }

  throw new Error("Failed to generate capture token");
}

export async function revokeCaptureToken(args: {
  userId: string;
  tokenId: string;
}): Promise<{ ok: true } | { ok: false; status: 404 }> {
  const existing = await prisma.captureToken.findFirst({
    where: { id: args.tokenId, userId: args.userId, revokedAt: null },
    select: { id: true },
  });

  if (!existing) return { ok: false, status: 404 };

  await prisma.captureToken.update({
    where: { id: args.tokenId },
    data: { revokedAt: new Date() },
  });

  return { ok: true };
}

export async function revokeCaptureTokensByScopeAndLabel(args: {
  userId: string;
  scope: CaptureTokenScope;
  label: string;
}): Promise<{ revoked: number }> {
  const result = await prisma.captureToken.updateMany({
    where: {
      userId: args.userId,
      revokedAt: null,
      label: args.label,
      scopes: { has: args.scope },
    },
    data: { revokedAt: new Date() },
  });

  return { revoked: result.count };
}

/**
 * 按 label 撤销该用户所有未撤销 token，不限 scope。
 * 用途：扩展授权重连时，无论旧 token 是 bilibili 专用还是通配符 capture:*，统一清理。
 */
export async function revokeCaptureTokensByLabel(args: {
  userId: string;
  label: string;
}): Promise<{ revoked: number }> {
  const result = await prisma.captureToken.updateMany({
    where: {
      userId: args.userId,
      revokedAt: null,
      label: args.label,
    },
    data: { revokedAt: new Date() },
  });

  return { revoked: result.count };
}

export async function verifyCaptureToken(args: {
  token: string;
  requiredScope: CaptureTokenScope;
}): Promise<
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; status: 401 | 403 }
> {
  const tokenHash = hashCaptureToken(args.token);

  const record = await prisma.captureToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true, scopes: true },
  });

  if (!record) return { ok: false, status: 401 };
  if (record.revokedAt) return { ok: false, status: 401 };
  if (!tokenHasScope(record.scopes, args.requiredScope)) return { ok: false, status: 403 };

  await prisma.captureToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return { ok: true, userId: record.userId, tokenId: record.id };
}

export async function verifyCaptureTokenForAnyCaptureScope(args: {
  token: string;
}): Promise<
  | { ok: true; userId: string; tokenId: string; scopes: string[] }
  | { ok: false; status: 401 | 403 }
> {
  const tokenHash = hashCaptureToken(args.token);

  const record = await prisma.captureToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true, scopes: true },
  });

  if (!record) return { ok: false, status: 401 };
  if (record.revokedAt) return { ok: false, status: 401 };
  if (!record.scopes.some((scope) => scope.startsWith("capture:"))) {
    return { ok: false, status: 403 };
  }

  await prisma.captureToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return { ok: true, userId: record.userId, tokenId: record.id, scopes: record.scopes };
}

