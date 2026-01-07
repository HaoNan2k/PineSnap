import { z } from "zod";
import { logError } from "@/lib/logger";
import { verifyCaptureToken } from "@/lib/db/capture-token";
import { createConversation, touchConversation, updateConversationTitle } from "@/lib/db/conversation";
import { createMessage } from "@/lib/db/message";
import { Role } from "@/generated/prisma/client";
import type { ChatPart } from "@/lib/chat/types";

const ALLOWED_ORIGINS = new Set(["https://www.bilibili.com"]);

function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-max-age": "86400",
      vary: "origin",
    };
  }
  return {};
}

function extractBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(.+)\s*$/i.exec(raw);
  if (!match) return null;
  return match[1] ?? null;
}

const cueSchema = z.object({
  startLabel: z.string().min(1).optional(),
  startMs: z.number().int().nonnegative().optional(),
  endMs: z.number().int().nonnegative().optional(),
  text: z.string().min(1),
});

const payloadSchema = z.object({
  v: z.literal(1),
  source: z.object({ url: z.string().url() }),
  video: z
    .object({
      title: z.string().optional(),
      bvid: z.string().optional(),
      p: z.number().int().positive().optional(),
    })
    .optional(),
  subtitles: z
    .object({
      extractor: z
        .union([
          z.literal("bilibili_ai_assistant_panel"),
          z.literal("unknown"),
        ])
        .optional(),
      cues: z.array(cueSchema),
    })
    .optional(),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);

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

    const titleBase = payload.video?.title?.trim() || "B站字幕";
    const conversation = await createConversation(userId);
    await updateConversationTitle(
      conversation.id,
      userId,
      titleBase.length > 0 ? `B站：${titleBase}`.slice(0, 60) : "B站字幕"
    );

    const cues = payload.subtitles?.cues ?? [];
    const lines = cues.map((c) => {
      const prefix = c.startLabel ? `[${c.startLabel}] ` : "";
      return `${prefix}${c.text}`;
    });

    const content = [
      `【来源】${payload.source.url}`,
      payload.video?.bvid ? `【BV】${payload.video.bvid}` : null,
      typeof payload.video?.p === "number" ? `【分P】${payload.video.p}` : null,
      "",
      "【字幕】",
      ...lines,
    ]
      .filter((v): v is string => typeof v === "string")
      .join("\n");

    const parts: ChatPart[] = [{ type: "text", text: content }];
    const message = await createMessage(conversation.id, Role.user, parts);
    await touchConversation(conversation.id, userId);

    return Response.json(
      { ok: true, captureId: message.id, conversationId: conversation.id },
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

