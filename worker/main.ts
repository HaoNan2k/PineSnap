import { z } from "zod";

import { processAudioTranscribeJob } from "../lib/capture/job-processor";
import { createCaptureArtifact } from "../lib/db/capture-artifact";
import { claimPendingCaptureJobs, markCaptureJobStatus } from "../lib/db/capture-job";
import { captureSourceTypeSchema } from "../lib/capture/context";
import { prisma } from "../lib/prisma";

function parsePositiveInt(value: string | undefined, fallback: number, min = 1): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function getPollIntervalMs(): number {
  return parsePositiveInt(process.env.WORKER_POLL_INTERVAL_MS, 10_000, 1_000);
}

function getBatchSize(): number {
  return parsePositiveInt(process.env.WORKER_BATCH_SIZE, 3, 1);
}

function getSourceTypeFilter() {
  const sourceType = process.env.CAPTURE_WORKER_SOURCE_TYPE?.trim();
  if (!sourceType) return undefined;
  const parsed = captureSourceTypeSchema.safeParse(sourceType);
  if (!parsed.success) {
    throw new Error(`Invalid CAPTURE_WORKER_SOURCE_TYPE: ${sourceType}`);
  }
  return parsed.data;
}

// 连续失败超过该阈值后主动 exit(1)，让 systemd 拉起新进程，
// 避免长寿进程的 PrismaPg 内部连接池死掉后无法自愈。
function getMaxConsecutiveErrors(): number {
  return parsePositiveInt(process.env.WORKER_MAX_CONSECUTIVE_ERRORS, 5, 1);
}

function toFailure(error: unknown): { code: string; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  if (/yt-dlp/i.test(message)) return { code: "ASR_AUDIO_EXTRACT_FAILED", message };
  if (/upload/i.test(message)) return { code: "ASR_UPLOAD_FAILED", message };
  if (/submit/i.test(message)) return { code: "ASR_SUBMIT_FAILED", message };
  if (/timeout/i.test(message)) return { code: "ASR_TIMEOUT", message };
  if (/download|audio/i.test(message)) return { code: "ASR_AUDIO_FETCH_FAILED", message };
  return { code: "ASR_TRANSCRIPT_ERROR", message };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function processBatch(args: {
  limit: number;
  sourceType?: z.infer<typeof captureSourceTypeSchema>;
}): Promise<number> {
  const jobs = await claimPendingCaptureJobs({
    limit: args.limit,
    sourceType: args.sourceType,
    jobType: "audio_transcribe",
  });

  if (jobs.length === 0) return 0;

  for (const job of jobs) {
    if (job.jobType !== "audio_transcribe") {
      await markCaptureJobStatus({
        jobId: job.id,
        status: "FAILED",
        stage: "FAILED",
        errorCode: "UNSUPPORTED_JOB_TYPE",
        errorMessage: `Unsupported jobType for worker: ${job.jobType}`,
        finishedAt: new Date(),
      });
      continue;
    }

    try {
      const processed = await processAudioTranscribeJob({ inputContext: job.inputContext });

      await markCaptureJobStatus({
        jobId: job.id,
        status: "RUNNING",
        stage: "PERSISTING_ARTIFACT",
      });

      await createCaptureArtifact({
        jobId: job.id,
        kind: "asr_transcript",
        language: processed.language,
        format: "cue_lines",
        schemaVersion: processed.schemaVersion,
        qualityScore: processed.qualityScore,
        content: processed.content,
        isPrimary: true,
      });

      await markCaptureJobStatus({
        jobId: job.id,
        status: "SUCCEEDED",
        stage: "COMPLETED",
        finishedAt: new Date(),
      });

      console.log(`[capture-worker] job succeeded: ${job.id}`);
    } catch (error) {
      const failure = toFailure(error);
      await markCaptureJobStatus({
        jobId: job.id,
        status: "FAILED",
        stage: "FAILED",
        errorCode: failure.code,
        errorMessage: failure.message,
        finishedAt: new Date(),
      });
      console.error(`[capture-worker] job failed: ${job.id} (${failure.code}) ${failure.message}`);
    }
  }

  return jobs.length;
}

let stopRequested = false;

async function main() {
  const pollIntervalMs = getPollIntervalMs();
  const batchSize = getBatchSize();
  const sourceType = getSourceTypeFilter();
  const maxConsecutiveErrors = getMaxConsecutiveErrors();

  console.log(
    `[capture-worker] started: poll=${pollIntervalMs}ms batch=${batchSize} sourceType=${sourceType ?? "all"} maxConsecutiveErrors=${maxConsecutiveErrors}`
  );

  process.on("SIGINT", () => {
    stopRequested = true;
  });
  process.on("SIGTERM", () => {
    stopRequested = true;
  });

  let consecutiveErrors = 0;

  while (!stopRequested) {
    try {
      const handled = await processBatch({
        limit: batchSize,
        sourceType,
      });

      consecutiveErrors = 0;

      if (handled === 0) {
        await sleep(pollIntervalMs);
      }
    } catch (error) {
      consecutiveErrors++;
      const backoffMs = Math.min(pollIntervalMs * 2 ** consecutiveErrors, 5 * 60_000);
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[capture-worker] poll error (${consecutiveErrors}x, backoff ${backoffMs}ms): ${message}`
      );

      if (consecutiveErrors >= maxConsecutiveErrors) {
        // 连接池死锁等不可恢复状态：exit(1) 让 systemd 重新拉起，
        // 比卡在 5 分钟 backoff 里无声死掉好得多。
        console.error(
          `[capture-worker] consecutive errors hit threshold (${maxConsecutiveErrors}), exiting for systemd auto-restart`
        );
        await prisma.$disconnect().catch(() => undefined);
        process.exit(1);
      }

      await sleep(backoffMs);
    }
  }

  console.log("[capture-worker] stopping");
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[capture-worker] fatal: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
