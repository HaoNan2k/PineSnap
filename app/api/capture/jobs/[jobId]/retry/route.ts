import { z } from "zod";
import { logError } from "@/lib/logger";
import {
  tokenHasScope,
  verifyCaptureTokenForAnyCaptureScope,
} from "@/lib/db/capture-token";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";
import { findCaptureJobByIdForUser, requeueCaptureJob } from "@/lib/db/capture-job";
import { isRetryableCaptureError } from "@/lib/capture/retry";

function extractBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(.+)\s*$/i.exec(raw);
  if (!match) return null;
  return match[1];
}

const paramsSchema = z.object({
  jobId: z.string().uuid(),
});

const bodySchema = z.object({
  force: z.boolean().optional(),
});

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: getCaptureCorsHeaders(req, "POST, OPTIONS", "authorization, content-type"),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const corsHeaders = getCaptureCorsHeaders(req, "POST, OPTIONS", "authorization, content-type");

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }
    const auth = await verifyCaptureTokenForAnyCaptureScope({ token });
    if (!auth.ok) {
      return Response.json(
        { error: auth.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: auth.status, headers: corsHeaders }
      );
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

    const job = await findCaptureJobByIdForUser({
      jobId: params.data.jobId,
      userId: auth.userId,
    });
    if (!job) {
      return Response.json({ error: "Not Found" }, { status: 404, headers: corsHeaders });
    }
    const requiredScope = `capture:${job.sourceType}`;
    if (!tokenHasScope(auth.scopes, requiredScope)) {
      return Response.json({ error: "Forbidden" }, { status: 403, headers: corsHeaders });
    }

    if (job.status === "SUCCEEDED") {
      return Response.json(
        { error: "Job already succeeded" },
        { status: 409, headers: corsHeaders }
      );
    }
    if (job.status === "RUNNING" || job.status === "PENDING") {
      return Response.json(
        { ok: true, jobId: job.id, status: job.status, skipped: true },
        { status: 200, headers: corsHeaders }
      );
    }

    const force = body.data.force ?? false;
    if (!force && !isRetryableCaptureError(job.errorCode)) {
      return Response.json(
        {
          error: "Job error is not retryable",
          retryable: false,
          errorCode: job.errorCode,
        },
        { status: 409, headers: corsHeaders }
      );
    }

    if (job.attempt >= job.maxAttempts && !force) {
      return Response.json(
        {
          error: "Retry attempts exceeded",
          retryable: false,
          attempt: job.attempt,
          maxAttempts: job.maxAttempts,
        },
        { status: 409, headers: corsHeaders }
      );
    }

    const updated = await requeueCaptureJob({
      jobId: job.id,
      attemptDelta: 1,
      stage: "QUEUED",
    });

    return Response.json(
      { ok: true, jobId: updated.id, status: updated.status, attempt: updated.attempt },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    logError("POST /api/capture/jobs/[jobId]/retry failed", err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
