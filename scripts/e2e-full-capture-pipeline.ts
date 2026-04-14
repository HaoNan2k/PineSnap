/**
 * 端到端：mint CaptureToken → POST /api/capture/jobs（B 站 URL + mediaCandidates 公网音频）→
 * 启动 worker → 轮询至 SUCCEEDED/FAILED → 校验 CaptureArtifact。
 *
 * - **默认**：启动本机 **AssemblyAI 兼容 mock**（`E2E_USE_ASSEMBLY_MOCK=1`），不依赖真实 API Key，
 *   用于验证「你们代码」全链路（与外部 ASR 账单解耦）。
 * - **真实转写**：设置 `ASSEMBLYAI_API_KEY` 且 `E2E_USE_ASSEMBLY_MOCK=0`，并确保能访问 api.assemblyai.com。
 *
 * mediaCandidates 模拟扩展上报直链，避免验证依赖 yt-dlp 拉 B 站页（易 412）。
 *
 * 用法（需 `pnpm dev` 在 E2E_CAPTURE_BASE_URL，默认 3000）：
 *   pnpm exec tsx scripts/e2e-full-capture-pipeline.ts
 */
import { config } from "dotenv";
import { createHash, randomBytes } from "crypto";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const repoRoot = process.cwd();

config({ path: path.join(repoRoot, ".env.local") });
config({ path: path.join(repoRoot, ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function mintPlainToken(): string {
  return `pscap_v1_${randomBytes(32).toString("base64url")}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

const TEST_USER_ID = "e2e-full-pipeline-user";
const PUBLIC_SAMPLE_MP3 =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 默认走本地 mock，便于无密钥复现全链路；真实 AssemblyAI：`E2E_USE_ASSEMBLY_MOCK=0` 且配置 `ASSEMBLYAI_API_KEY`。 */
function useAssemblyMock(): boolean {
  const explicit = process.env.E2E_USE_ASSEMBLY_MOCK?.trim().toLowerCase();
  if (explicit === "0" || explicit === "false") return false;
  return true;
}

async function startAssemblyAiMock(): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const transcriptId = "e2e_mock_transcript_01";
  const server = http.createServer((req, res) => {
    const url = req.url ?? "";
    if (req.method === "POST" && url === "/v2/upload") {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c as Buffer));
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ upload_url: "https://mock.invalid/e2e-upload.bin" }));
      });
      return;
    }
    if (req.method === "POST" && url === "/v2/transcript") {
      let body = "";
      req.on("data", (c) => {
        body += c;
      });
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ id: transcriptId }));
      });
      return;
    }
    if (req.method === "GET" && url === `/v2/transcript/${transcriptId}`) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: transcriptId,
          status: "completed",
          text: "E2E mock transcript: never gonna give you up.",
          language_code: "en",
          language_confidence: 0.95,
          speech_model_used: "universal-2",
          speech_models: ["universal-2"],
          audio_duration: 3,
          utterances: [
            {
              start: 0,
              text: "E2E mock transcript: never gonna give you up.",
              speaker: null,
            },
          ],
        })
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("mock server address");
  }
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  return {
    baseUrl,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function main() {
  const mock = useAssemblyMock();
  let mockClose: (() => Promise<void>) | null = null;
  const workerEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_OPTIONS: "--conditions=react-server",
    WORKER_POLL_INTERVAL_MS: "400",
    WORKER_BATCH_SIZE: "3",
    CAPTURE_WORKER_SOURCE_TYPE: "bilibili",
    ASSEMBLYAI_POLL_INTERVAL_MS: "200",
    ASSEMBLYAI_POLL_TIMEOUT_MS: "120000",
  };

  if (mock) {
    const { baseUrl, close } = await startAssemblyAiMock();
    mockClose = close;
    workerEnv.ASSEMBLYAI_BASE_URL = baseUrl;
    workerEnv.ASSEMBLYAI_API_KEY = "e2e-mock-key";
    console.log("[e2e] using AssemblyAI mock at", baseUrl);
  } else {
    if (!process.env.ASSEMBLYAI_API_KEY?.trim()) {
      console.error("E2E_USE_ASSEMBLY_MOCK=0 requires ASSEMBLYAI_API_KEY");
      process.exit(1);
    }
    console.log("[e2e] using real AssemblyAI (ASSEMBLYAI_API_KEY set)");
  }

  const token = mintPlainToken();
  await prisma.captureToken.create({
    data: {
      userId: TEST_USER_ID,
      tokenHash: hashToken(token),
      label: "e2e-full-pipeline",
      scopes: ["capture:bilibili"],
    },
  });

  const captureRequestId = `e2e-full-${Date.now()}`;
  const capturedAt = new Date().toISOString();
  const sourceUrl = "https://www.bilibili.com/video/BV1GJ411x7h7/";

  const body = {
    captureContext: {
      schemaVersion: 1,
      sourceType: "bilibili",
      sourceUrl,
      captureRequestId,
      capturedAt,
      providerContext: { bilibili: { bvid: "BV1GJ411x7h7" } },
      mediaCandidates: [
        {
          kind: "audio" as const,
          url: PUBLIC_SAMPLE_MP3,
          mimeType: "audio/mpeg",
        },
      ],
    },
    title: "E2E full pipeline (BV + mediaCandidates)",
  };

  const baseUrlApi = process.env.E2E_CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";
  const res = await fetch(`${baseUrlApi}/api/capture/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as unknown;
  console.log("POST /api/capture/jobs", res.status, json);

  if (!res.ok || !json || typeof json !== "object" || !("jobId" in json)) {
    await prisma.captureToken.deleteMany({
      where: { userId: TEST_USER_ID, label: "e2e-full-pipeline" },
    });
    if (mockClose) await mockClose();
    await prisma.$disconnect();
    process.exit(1);
  }

  const jobId = (json as { jobId: string }).jobId;

  const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");
  const child = spawn(tsxBin, ["worker/main.ts"], {
    cwd: repoRoot,
    env: workerEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let workerOut = "";
  child.stdout?.on("data", (c: Buffer) => {
    workerOut += c.toString();
    process.stdout.write(c);
  });
  child.stderr?.on("data", (c: Buffer) => {
    process.stderr.write(c);
  });

  const deadline = Date.now() + 240_000;
  let finalStatus: string | null = null;

  while (Date.now() < deadline) {
    await sleep(400);
    const job = await prisma.captureJob.findUnique({
      where: { id: jobId },
      select: { status: true, errorCode: true, errorMessage: true },
    });
    if (job?.status === "SUCCEEDED" || job?.status === "FAILED") {
      finalStatus = job.status;
      console.log("\n[e2e] terminal job status:", job);
      break;
    }
  }

  child.kill("SIGTERM");
  await sleep(500);
  if (child.pid) {
    try {
      child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }

  if (mockClose) {
    await mockClose();
    mockClose = null;
  }

  if (finalStatus !== "SUCCEEDED") {
    await prisma.captureToken.deleteMany({
      where: { userId: TEST_USER_ID, label: "e2e-full-pipeline" },
    });
    await prisma.$disconnect();
    console.error(
      "[e2e] did not reach SUCCEEDED within timeout; worker log tail:\n",
      workerOut.slice(-2500)
    );
    process.exit(1);
  }

  const artifacts = await prisma.captureArtifact.findMany({
    where: { jobId },
    select: {
      id: true,
      kind: true,
      format: true,
      isPrimary: true,
      content: true,
    },
  });

  console.log("[e2e] CaptureArtifact count:", artifacts.length);
  const primary = artifacts.find((a) => a.isPrimary && a.kind === "asr_transcript");
  if (!primary) {
    await prisma.captureToken.deleteMany({
      where: { userId: TEST_USER_ID, label: "e2e-full-pipeline" },
    });
    await prisma.$disconnect();
    console.error("[e2e] missing primary asr_transcript artifact");
    process.exit(1);
  }

  const content = primary.content as { lines?: Array<{ text: string }>; metadata?: { source?: string } };
  const firstLine = content.lines?.[0]?.text ?? "(no lines)";
  console.log("[e2e] artifact first line:", firstLine);
  console.log("[e2e] artifact line count:", content.lines?.length ?? 0);
  console.log("[e2e] artifact metadata.source:", content.metadata?.source);

  const deleted = await prisma.captureToken.deleteMany({
    where: { userId: TEST_USER_ID, label: "e2e-full-pipeline" },
  });
  console.log("[e2e] cleaned CaptureToken rows:", deleted.count);

  await prisma.$disconnect();
  console.log("[e2e] OK: API → worker → ASR → artifact → SUCCEEDED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
