/**
 * E2E: mint CaptureToken (plaintext only at creation time), POST /api/capture/jobs, verify DB row.
 * Run from repo root: pnpm exec tsx scripts/e2e-verify-capture-job.ts
 * Loads .env.local then .env for DATABASE_URL.
 */
import { config } from "dotenv";
import { createHash, randomBytes } from "crypto";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });
config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set (.env.local / .env)");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function mintPlainToken(): string {
  return `pscap_v1_${randomBytes(32).toString("base64url")}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const TEST_USER_ID = "e2e-verify-capture-user";

async function main() {
  const token = mintPlainToken();
  const tokenHash = hashToken(token);

  await prisma.captureToken.create({
    data: {
      userId: TEST_USER_ID,
      tokenHash,
      label: "e2e-verify-capture-job",
      scopes: ["capture:bilibili"],
    },
  });

  const captureRequestId = `e2e-req-${Date.now()}`;
  const capturedAt = new Date().toISOString();
  const sourceUrl = "https://www.bilibili.com/video/BV1GJ411x7h7/";

  const body = {
    captureContext: {
      schemaVersion: 1,
      sourceType: "bilibili",
      sourceUrl,
      captureRequestId,
      capturedAt,
      providerContext: {
        bilibili: { bvid: "BV1GJ411x7h7" },
      },
    },
    title: "E2E Never Gonna Give You Up",
  };

  const baseUrl = process.env.E2E_CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";
  const res = await fetch(`${baseUrl}/api/capture/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = null;
  }

  console.log("HTTP", res.status);
  console.log("Response", json ?? text);

  if (!res.ok || !json || typeof json !== "object" || !("jobId" in json)) {
    await prisma.captureToken.deleteMany({
      where: { userId: TEST_USER_ID, label: "e2e-verify-capture-job" },
    });
    await prisma.$disconnect();
    process.exit(1);
  }

  const jobId = (json as { jobId: string }).jobId;
  const job = await prisma.captureJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      jobType: true,
      captureRequestId: true,
      resourceId: true,
      resource: { select: { userId: true, title: true, canonicalUrl: true } },
    },
  });

  console.log("DB CaptureJob", job);

  const deleted = await prisma.captureToken.deleteMany({
    where: { userId: TEST_USER_ID, label: "e2e-verify-capture-job" },
  });
  console.log("Cleaned up CaptureToken row(s):", deleted.count);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
