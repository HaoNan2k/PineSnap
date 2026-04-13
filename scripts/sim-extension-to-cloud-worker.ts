/**
 * 模拟浏览器扩展：本地 POST /api/capture/jobs → 同一 DATABASE_URL 下云 Worker 领取并处理。
 *
 * **mediaCandidates**：应用与真实扩展一致，由你在浏览器里从播放请求（如 `*.m4s` DASH 音轨）复制直链，
 * 通过环境变量注入（签名 URL 会过期，POST 后应尽快被 Worker 拉取）。
 *
 * 示例（BV + 浏览器里拿到的音轨 URL）：
 *   E2E_CAPTURE_BASE_URL=http://127.0.0.1:3002 \
 *   E2E_BV=BV1im9vYKEWB \
 *   E2E_MEDIA_CANDIDATE_URL='https://upos-...30232.m4s?...' \
 *   E2E_MEDIA_DURATION_SEC=537 \
 *   pnpm exec tsx scripts/sim-extension-to-cloud-worker.ts
 *
 * 未设置 `E2E_MEDIA_CANDIDATE_URL` 时，回退为短公网 MP3（仅便于冒烟，长视频请用上面方式）。
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "crypto";
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

const FALLBACK_SHORT_MP3 =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function main() {
  const bv = (process.env.E2E_BV ?? "BV1GJ411x7h7").trim();
  const fromFile = process.env.E2E_MEDIA_CANDIDATE_FILE?.trim();
  let mediaUrl = (process.env.E2E_MEDIA_CANDIDATE_URL ?? "").trim();
  if (!mediaUrl && fromFile) {
    mediaUrl = fs.readFileSync(fromFile, "utf8").trim().split(/\r?\n/)[0] ?? "";
  }
  if (!mediaUrl) mediaUrl = FALLBACK_SHORT_MP3;
  const durationSec = parsePositiveInt(process.env.E2E_MEDIA_DURATION_SEC, 0);
  const sim = `sim${Date.now()}`;
  const sourceUrl = `https://www.bilibili.com/video/${bv}/?vd_${sim}=1`;

  const token = `pscap_v1_${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  const userId = "sim-extension-cloud-user";

  await prisma.captureToken.create({
    data: {
      userId,
      tokenHash,
      label: "sim-ext-cloud-e2e",
      scopes: ["capture:bilibili"],
    },
  });

  const captureRequestId = `sim-req-${sim}`;
  const mediaCandidates: Array<{
    kind: "audio";
    url: string;
    mimeType?: string;
    durationSec?: number;
  }> = [
    {
      kind: "audio",
      url: mediaUrl,
      mimeType: mediaUrl.includes(".m4s") ? "audio/mp4" : "audio/mpeg",
      ...(durationSec > 0 ? { durationSec } : {}),
    },
  ];

  const body = {
    captureContext: {
      schemaVersion: 1,
      sourceType: "bilibili",
      sourceUrl,
      captureRequestId,
      capturedAt: new Date().toISOString(),
      accessContext: {
        referer: "https://www.bilibili.com/",
        userAgent:
          process.env.E2E_EXTENSION_UA ??
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 (PineSnap ext sim)",
      },
      providerContext: { bilibili: { bvid: bv } },
      mediaCandidates,
    },
    title: process.env.E2E_JOB_TITLE ?? `扩展模拟→云Worker ${bv} ${sim.slice(-8)}`,
  };

  const baseUrl = process.env.E2E_CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";
  console.log("[sim-ext] POST captureContext.sourceUrl:", sourceUrl);
  console.log(
    "[sim-ext] mediaCandidates[0] prefix:",
    mediaCandidates[0].url.slice(0, 72) + "…"
  );

  const res = await fetch(`${baseUrl}/api/capture/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as Record<string, unknown>;
  console.log("POST /api/capture/jobs", res.status, json);

  if (!res.ok || typeof json.jobId !== "string") {
    await prisma.captureToken.deleteMany({ where: { userId, label: "sim-ext-cloud-e2e" } });
    await prisma.$disconnect();
    process.exit(1);
  }

  const jobId = json.jobId;
  console.log("\njobId:", jobId);
  console.log(
    "云主机监控: ssh pinesnap-worker \"journalctl -u pinesnap-worker-staging -f\"  # 另开终端；或:\n" +
      `ssh pinesnap-worker "journalctl -u pinesnap-worker-staging -n 400 --no-pager | grep ${jobId}"\n`
  );

  const pollMs = parsePositiveInt(process.env.E2E_POLL_MS, 8000);
  /** 长音频 ASR 较慢，默认轮询 25 分钟 */
  const deadlineMs = parsePositiveInt(process.env.E2E_POLL_DEADLINE_MS, 1_500_000);
  const deadline = Date.now() + deadlineMs;

  while (Date.now() < deadline) {
    const job = await prisma.captureJob.findUnique({
      where: { id: jobId },
      select: {
        status: true,
        stage: true,
        errorCode: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
    console.log(new Date().toISOString(), JSON.stringify(job));
    if (job?.status === "SUCCEEDED" || job?.status === "FAILED") {
      const n = await prisma.captureArtifact.count({ where: { jobId } });
      console.log("CaptureArtifact count:", n);
      break;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  await prisma.captureToken.deleteMany({ where: { userId, label: "sim-ext-cloud-e2e" } });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
