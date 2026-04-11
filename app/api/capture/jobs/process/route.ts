import { z } from "zod";
import { logError } from "@/lib/logger";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";
import { captureSourceTypeSchema } from "@/lib/capture/context";
import { processAudioTranscribeJob } from "@/lib/capture/job-processor";
import { createCaptureArtifact } from "@/lib/db/capture-artifact";
import { claimPendingCaptureJobs, markCaptureJobStatus } from "@/lib/db/capture-job";

const bodySchema = z.object({
  limit: z.number().int().min(1).max(50).default(5),
  sourceType: captureSourceTypeSchema.optional(),
});

function isWorkerAuthorized(req: Request): boolean {
  const expected = process.env.CAPTURE_WORKER_KEY;
  if (!expected || expected.trim().length === 0) return false;
  const provided = req.headers.get("x-capture-worker-key");
  return provided === expected;
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

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: getCaptureCorsHeaders(req, "POST, OPTIONS", "content-type, x-capture-worker-key"),
  });
}

export async function POST(req: Request) {
  const corsHeaders = getCaptureCorsHeaders(
    req,
    "POST, OPTIONS",
    "content-type, x-capture-worker-key"
  );

  try {
    if (!isWorkerAuthorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const rawBody: unknown = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const jobs = await claimPendingCaptureJobs({
      limit: parsed.data.limit,
      sourceType: parsed.data.sourceType,
    });

    const results: Array<{
      jobId: string;
      status: "SUCCEEDED" | "FAILED";
      errorCode?: string;
      errorMessage?: string;
    }> = [];

    for (const job of jobs) {
      if (job.jobType !== "audio_transcribe") {
        await markCaptureJobStatus({
          jobId: job.id,
          status: "FAILED",
          stage: "FAILED",
          errorCode: "UNSUPPORTED_JOB_TYPE",
          errorMessage: `Unsupported jobType for process endpoint: ${job.jobType}`,
          finishedAt: new Date(),
        });
        results.push({
          jobId: job.id,
          status: "FAILED",
          errorCode: "UNSUPPORTED_JOB_TYPE",
          errorMessage: `Unsupported jobType for process endpoint: ${job.jobType}`,
        });
        continue;
      }

      try {
        const processed = await processAudioTranscribeJob({
          inputContext: job.inputContext,
        });

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

        results.push({ jobId: job.id, status: "SUCCEEDED" });
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
        results.push({
          jobId: job.id,
          status: "FAILED",
          errorCode: failure.code,
          errorMessage: failure.message,
        });
      }
    }

    return Response.json(
      {
        ok: true,
        claimed: jobs.length,
        succeeded: results.filter((item) => item.status === "SUCCEEDED").length,
        failed: results.filter((item) => item.status === "FAILED").length,
        results,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    logError("POST /api/capture/jobs/process failed", err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
