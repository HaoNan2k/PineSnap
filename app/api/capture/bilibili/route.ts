import { z } from "zod";
import { logError } from "@/lib/logger";
import { verifyCaptureToken } from "@/lib/db/capture-token";
import { createResource } from "@/lib/db/resource";
import { getCaptureCorsHeaders } from "@/lib/capture/cors";

function extractBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(.+)\s*$/i.exec(raw);
  if (!match) return null;
  return match[1];
}

const cueSchema = z.object({
  startMs: z.number().int().nonnegative().optional(),
  startLabel: z.string().min(1).optional(),
  text: z.string().min(1),
});

const chapterSchema = z.object({
  startMs: z.number().int().nonnegative().optional(),
  startLabel: z.string().min(1).optional(),
  title: z.string().min(1),
});

const payloadSchema = z.object({
  version: z.literal(1),
  metadata: z.object({
    platform: z.literal("bilibili"),
    id: z.string().optional(),
    url: z.string().url(),
    title: z.string().optional(),
    /** 可选：扩展端自检/排障元数据，原样写入 Resource.content */
    captureDiagnostics: z.record(z.string(), z.unknown()).optional(),
  }),
  content: z.object({
    summary: z
      .object({
        provider: z.string(),
        text: z.string().optional(),
        chapters: z.array(chapterSchema).optional(),
      })
      .optional(),
    transcript: z
      .object({
        provider: z.string(),
        language: z.string().optional(),
        lines: z.array(cueSchema),
      })
      .optional(),
  }),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCaptureCorsHeaders(req) });
}

export async function POST(req: Request) {
  const corsHeaders = getCaptureCorsHeaders(req);

  try {
    const token = extractBearerToken(req);
    if (!token) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const auth = await verifyCaptureToken({
      token,
      requiredScope: "capture:bilibili",
    });
    if (!auth.ok) {
      return Response.json(
        { error: auth.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: auth.status, headers: corsHeaders }
      );
    }

    const bodyJson: unknown = await req.json();
    const parsed = payloadSchema.safeParse(bodyJson);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400, headers: corsHeaders }
      );
    }

    const payload = parsed.data;
    const userId = auth.userId;

    const titleBase = payload.metadata.title?.trim() || "B站采集";
    const title =
      titleBase.length > 0 ? `B站：${titleBase}`.slice(0, 80) : "B站采集";

    const externalId = payload.metadata.id || null;

    const resource = await createResource({
      userId,
      type: "bilibili_capture",
      title,
      externalId,
      content: payload,
    });

    return Response.json(
      { ok: true, resourceId: resource.id },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    logError("POST /api/capture/bilibili failed", err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
