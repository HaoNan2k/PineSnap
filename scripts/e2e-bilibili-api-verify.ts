/**
 * E2E 验证：直接往 DB 插入一个 bilibili capture job（不走 HTTP API），
 * 让云 Worker 通过 Bilibili 公开 API 获取音频 URL 并完成 ASR。
 *
 * 用法：
 *   pnpm exec tsx scripts/e2e-bilibili-api-verify.ts
 *
 * 可选环境变量：
 *   E2E_BV          — 要测试的 BV 号（默认 BV1GJ411x7h7）
 *   E2E_POLL_MS     — 轮询间隔（默认 8000）
 *   E2E_POLL_DEADLINE_MS — 总等待时长（默认 600000 = 10 分钟）
 */
import { config } from "dotenv";
import path from "node:path";
import { randomBytes } from "crypto";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const repoRoot = process.cwd();
config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function main() {
  const bv = (process.env.E2E_BV ?? "BV1GJ411x7h7").trim();
  const sourceUrl = `https://www.bilibili.com/video/${bv}/`;
  const captureRequestId = `e2e-bili-api-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const userId = "e2e-bilibili-api-verify";

  // inputContext: 不包含 mediaCandidates，迫使 Worker 走 Bilibili API 路径
  const inputContext = {
    schemaVersion: 1,
    sourceType: "bilibili",
    sourceUrl,
    captureRequestId,
    capturedAt: new Date().toISOString(),
    accessContext: {
      referer: "https://www.bilibili.com/",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
    providerContext: { bilibili: { bvid: bv } },
    // 注意：没有 mediaCandidates，Worker 会跳过 candidates 直接走 Bilibili API
  };

  // 创建 Resource + Job
  let resource = await prisma.resource.findFirst({
    where: { userId, sourceType: "bilibili", canonicalUrl: sourceUrl },
    select: { id: true },
  });

  if (!resource) {
    resource = await prisma.resource.create({
      data: {
        userId,
        sourceType: "bilibili",
        canonicalUrl: sourceUrl,
        title: `E2E verify ${bv}`,
      },
      select: { id: true },
    });
  }

  const job = await prisma.captureJob.create({
    data: {
      resourceId: resource.id,
      sourceType: "bilibili",
      jobType: "audio_transcribe",
      executionMode: "ASYNC",
      captureRequestId,
      inputContext: inputContext as any,
      status: "PENDING",
    },
    select: { id: true, status: true },
  });

  console.log(`[e2e] Created job: ${job.id}`);
  console.log(`[e2e] BV: ${bv}`);
  console.log(`[e2e] No mediaCandidates → Worker should use Bilibili API path`);
  console.log(
    `[e2e] Monitor cloud: ssh pinesnap-worker "journalctl -u pinesnap-worker-staging -f | grep ${job.id}"`
  );

  // 轮询等待
  const pollMs = parsePositiveInt(process.env.E2E_POLL_MS, 8000);
  const deadlineMs = parsePositiveInt(process.env.E2E_POLL_DEADLINE_MS, 600_000);
  const deadline = Date.now() + deadlineMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    const current = await prisma.captureJob.findUnique({
      where: { id: job.id },
      select: {
        status: true,
        stage: true,
        errorCode: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
    console.log(new Date().toISOString(), JSON.stringify(current));

    if (current?.status === "SUCCEEDED") {
      const artifacts = await prisma.captureArtifact.findMany({
        where: { jobId: job.id },
        select: { id: true, kind: true, format: true, isPrimary: true },
      });
      console.log(`\n[e2e] SUCCESS! Artifacts: ${artifacts.length}`);
      for (const a of artifacts) {
        console.log(`  - ${a.kind} (${a.format}) primary=${a.isPrimary}`);
      }

      // 检查 source 是否为 bilibili_api
      const primary = await prisma.captureArtifact.findFirst({
        where: { jobId: job.id, isPrimary: true },
        select: { content: true },
      });
      const content = primary?.content as any;
      const source = content?.metadata?.source;
      console.log(`[e2e] Audio source: ${source}`);
      if (source === "bilibili_api") {
        console.log("[e2e] CONFIRMED: Worker used Bilibili public API to download audio");
      } else {
        console.log(`[e2e] NOTE: Worker used "${source}" instead of bilibili_api`);
      }
      break;
    }

    if (current?.status === "FAILED") {
      console.error(`\n[e2e] FAILED: ${current.errorCode} — ${current.errorMessage}`);
      process.exit(1);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
