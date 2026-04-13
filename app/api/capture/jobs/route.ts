import { z } from "zod";
import { logError } from "@/lib/logger";
import { verifyCaptureToken } from "@/lib/db/capture-token";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";
import { CaptureArtifactFormat } from "@/generated/prisma/client";
import {
  buildSourceFingerprint,
  captureJobTypeSchema,
  captureContextSchema,
  inferJobTypeFromSource,
  inferResourceType,
  normalizeCanonicalUrl,
  requiredCaptureScope,
} from "@/lib/capture/context";
import {
  createCaptureResourceAndJobWithIdempotency,
  markCaptureJobStatus,
} from "@/lib/db/capture-job";
import { createCaptureArtifact } from "@/lib/db/capture-artifact";

function extractBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(.+)\s*$/i.exec(raw);
  if (!match) return null;
  return match[1];
}

const artifactSchema = z.object({
  kind: z.enum(["official_subtitle", "asr_transcript", "summary", "extracted_text"]),
  language: z.string().min(1).max(64).optional(),
  format: z.nativeEnum(CaptureArtifactFormat).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  content: z.unknown(),
  isPrimary: z.boolean().optional(),
});

const createJobSchema = z.object({
  captureContext: captureContextSchema,
  jobType: captureJobTypeSchema.optional(),
  executionMode: z.enum(["INLINE", "ASYNC"]).optional(),
  title: z.string().min(1).max(200).optional(),
  externalId: z.string().min(1).max(200).optional(),
  artifact: artifactSchema.optional(),
});

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: getCaptureCorsHeaders(req, "POST, OPTIONS", "authorization, content-type"),
  });
}

export async function POST(req: Request) {
  const corsHeaders = getCaptureCorsHeaders(req, "POST, OPTIONS", "authorization, content-type");

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const bodyUnknown: unknown = await req.json();
    const parsed = createJobSchema.safeParse(bodyUnknown);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const { captureContext, artifact, title, externalId, jobType, executionMode } = parsed.data;
    const auth = await verifyCaptureToken({
      token,
      requiredScope: requiredCaptureScope(captureContext.sourceType),
    });

    if (!auth.ok) {
      return Response.json(
        { error: auth.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: auth.status, headers: corsHeaders }
      );
    }

    const canonicalUrl = captureContext.canonicalUrl ?? normalizeCanonicalUrl(captureContext.sourceUrl);
    const sourceFingerprint = buildSourceFingerprint(captureContext.sourceType, canonicalUrl);
    const resourceTitle =
      title?.trim() ||
      `${captureContext.sourceType}: ${new URL(captureContext.sourceUrl).hostname}`.slice(0, 200);
    const created = await createCaptureResourceAndJobWithIdempotency({
      userId: auth.userId,
      sourceType: captureContext.sourceType,
      jobType: jobType ?? inferJobTypeFromSource(captureContext.sourceType),
      executionMode: executionMode ?? (artifact ? "INLINE" : "ASYNC"),
      captureRequestId: captureContext.captureRequestId,
      inputContext: captureContext,
      resource: {
        type: inferResourceType(captureContext.sourceType),
        sourceUrl: captureContext.sourceUrl,
        canonicalUrl,
        sourceFingerprint,
        title: resourceTitle,
        externalId: externalId ?? null,
        content: {
          schemaVersion: captureContext.schemaVersion,
          captureContext,
        },
      },
      initialJob: {
        status: artifact ? "RUNNING" : "PENDING",
        stage: artifact ? "PERSISTING_ARTIFACT" : "QUEUED",
      },
    });
    const resourceId = created.resource.id;
    const jobId = created.job.id;

    if (created.idempotent) {
      return Response.json(
        {
          ok: true,
          resourceId,
          jobId,
          status: created.job.status,
          idempotent: true,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    if (artifact) {
      await createCaptureArtifact({
        resourceId,
        jobId,
        kind: artifact.kind,
        language: artifact.language ?? null,
        format: artifact.format ?? null,
        qualityScore: artifact.qualityScore ?? null,
        content: artifact.content,
        isPrimary: artifact.isPrimary ?? true,
      });

      await markCaptureJobStatus({
        jobId,
        status: "SUCCEEDED",
        stage: "COMPLETED",
        startedAt: new Date(),
        finishedAt: new Date(),
      });
    }

    return Response.json(
      {
        ok: true,
        resourceId,
        jobId,
        status: artifact ? "SUCCEEDED" : "PENDING",
        idempotent: created.idempotent,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    logError("POST /api/capture/jobs failed", err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
