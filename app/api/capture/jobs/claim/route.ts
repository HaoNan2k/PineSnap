import { z } from "zod";
import { logError } from "@/lib/logger";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";
import { captureSourceTypeSchema } from "@/lib/capture/context";
import { claimPendingCaptureJobs } from "@/lib/db/capture-job";

const bodySchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
  sourceType: captureSourceTypeSchema.optional(),
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

    return Response.json({ ok: true, jobs }, { status: 200, headers: corsHeaders });
  } catch (err) {
    logError("POST /api/capture/jobs/claim failed", err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
