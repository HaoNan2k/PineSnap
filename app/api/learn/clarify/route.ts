import { z } from "zod";
import { generateObject } from "ai";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { getResourceForUser } from "@/lib/db/resource";

const bodySchema = z.object({
  resourceId: z.string().uuid(),
});

const clarifySchema = z.object({
  questions: z.array(z.string().min(1)).length(3),
});

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

  const title = resource.title.trim();

  const result = await generateObject({
    model: "google/gemini-2.0-flash",
    schema: clarifySchema,
    system:
      "你是学习教练。请输出恰好 3 条澄清问题，帮助明确学习目标。问题应简洁、可回答。",
    prompt: `素材标题：${title}\n请生成 3 个澄清问题。`,
  });

  return Response.json({ ok: true, questions: result.object.questions });
}
