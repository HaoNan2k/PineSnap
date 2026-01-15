import { z } from "zod";

import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { getResourceForUser } from "@/lib/db/resource";

const bodySchema = z.object({
  resourceId: z.string().uuid(),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyJson: unknown = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const resource = await getResourceForUser({
    userId,
    id: parsed.data.resourceId,
  });
  if (!resource) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }

  const payload: unknown = resource.content;
  const payloadMetadata =
    isRecord(payload) && isRecord(payload.metadata) ? payload.metadata : null;

  const titleFromPayload =
    payloadMetadata && typeof payloadMetadata.title === "string"
      ? payloadMetadata.title.trim()
      : "";
  const urlFromPayload =
    payloadMetadata && typeof payloadMetadata.url === "string"
      ? payloadMetadata.url.trim()
      : "";

  const title = titleFromPayload.length > 0 ? titleFromPayload : resource.title;
  const url = urlFromPayload.length > 0 ? urlFromPayload : null;

  const prompt = [
    `围绕这条素材，请你完成下面 3 个问题：`,
    `1) 用一句话概括核心观点。`,
    `2) 列出 2 个关键术语，并解释它们各自是什么意思。`,
    `3) 举 1 个你自己可能会用到的应用场景。`,
    "",
    `素材标题：${title}`,
    ...(url ? [`素材链接：${url}`] : []),
  ].join("\n");

  return Response.json({
    ok: true,
    card: {
      id: crypto.randomUUID(),
      type: "question",
      title: "理解检查",
      prompt,
    },
  });
}
