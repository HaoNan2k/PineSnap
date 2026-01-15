import { z } from "zod";
import { generateText } from "ai";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { getResourceForUser } from "@/lib/db/resource";

const itemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const bodySchema = z.object({
  resourceId: z.string().uuid(),
  items: z.array(itemSchema).length(3),
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

  const qaBlock = parsed.data.items
    .map((item, index) => `${index + 1}. ${item.question}\n答：${item.answer}`)
    .join("\n\n");

  const { text } = await generateText({
    model: "google/gemini-2.0-flash",
    system:
      "你是学习计划制定助手。请输出 Markdown 文本形式的学习计划，简洁可执行。",
    prompt: `素材标题：${resource.title}\n\n澄清问答：\n${qaBlock}\n\n请生成学习计划（Markdown）。`,
  });

  return Response.json({ ok: true, planText: text });
}
