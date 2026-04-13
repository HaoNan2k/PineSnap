import { z } from "zod";
import { logError } from "@/lib/logger";
import {
  tokenHasScope,
  verifyCaptureTokenForAnyCaptureScope,
} from "@/lib/db/capture-token";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";
import { findCaptureJobByIdForUser } from "@/lib/db/capture-job";

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

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: getCaptureCorsHeaders(req, "GET, OPTIONS", "authorization, content-type"),
  });
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const corsHeaders = getCaptureCorsHeaders(req, "GET, OPTIONS", "authorization, content-type");

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

    return Response.json({ ok: true, job }, { status: 200, headers: corsHeaders });
  } catch (err) {
    logError("GET /api/capture/jobs/[jobId] failed", err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
