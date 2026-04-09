import { z } from "zod";
import { logError } from "@/lib/logger";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";
import { CaptureArtifactFormat, CaptureJobStage } from "@/generated/prisma/client";
import { findCaptureJobById, markCaptureJobStatus } from "@/lib/db/capture-job";
import { createCaptureArtifact } from "@/lib/db/capture-artifact";

const paramsSchema = z.object({
  jobId: z.string().uuid(),
});

const bodySchema = z.object({
  status: z.enum(["SUCCEEDED", "FAILED", "CANCELLED"]),
  stage: z.nativeEnum(CaptureJobStage).optional(),
  errorCode: z.string().min(1).max(120).optional(),
  errorMessage: z.string().min(1).max(2000).optional(),
  artifact: z
    .object({
      kind: z.enum(["official_subtitle", "asr_transcript", "summary", "extracted_text"]),
      language: z.string().min(1).max(64).optional(),
      format: z.nativeEnum(CaptureArtifactFormat).optional(),
      qualityScore: z.number().min(0).max(1).optional(),
      content: z.unknown(),
      isPrimary: z.boolean().optional(),
    })
    .optional(),
});

function isWorkerAuthorized(req: Request): boolean {
  const expected = process.env.CAPTURE_WORKER_KEY;
  if (!expected || expected.trim().length === 0) return false;
  const provided = req.headers.get("x-capture-worker-key");
  return provided === expected;
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: getCaptureCorsHeaders(req, "POST, OPTIONS", "content-type, x-capture-worker-key"),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const corsHeaders = getCaptureCorsHeaders(
    req,
    "POST, OPTIONS",
    "content-type, x-capture-worker-key"
  );
  try {
    if (!isWorkerAuthorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const params = paramsSchema.safeParse(await ctx.params);
    if (!params.success) {
      return Response.json(
        { error: "Invalid params", details: params.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const rawBody: unknown = await req.json().catch(() => ({}));
    const body = bodySchema.safeParse(rawBody);
    if (!body.success) {
      return Response.json(
        { error: "Invalid request body", details: body.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const job = await findCaptureJobById({
      jobId: params.data.jobId,
    });
    if (!job) {
      return Response.json({ error: "Not Found" }, { status: 404, headers: corsHeaders });
    }

    if (body.data.status === "SUCCEEDED" && body.data.artifact) {
      await createCaptureArtifact({
        resourceId: job.resourceId,
        jobId: job.id,
        kind: body.data.artifact.kind,
        language: body.data.artifact.language ?? null,
        format: body.data.artifact.format ?? null,
        qualityScore: body.data.artifact.qualityScore ?? null,
        content: body.data.artifact.content,
        isPrimary: body.data.artifact.isPrimary ?? true,
      });
    }

    const updated = await markCaptureJobStatus({
      jobId: job.id,
      status: body.data.status,
      stage:
        body.data.stage ??
        (body.data.status === "SUCCEEDED"
          ? "COMPLETED"
          : body.data.status === "CANCELLED"
            ? "CANCELLED"
            : "FAILED"),
      errorCode: body.data.errorCode ?? null,
      errorMessage: body.data.errorMessage ?? null,
      finishedAt: new Date(),
    });

    return Response.json({ ok: true, job: updated }, { status: 200, headers: corsHeaders });
  } catch (err) {
    logError("POST /api/capture/jobs/[jobId]/complete failed", err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
