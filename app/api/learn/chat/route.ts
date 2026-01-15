import { z } from "zod";
import { generateText, type ModelMessage } from "ai";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import { getResourceForUser } from "@/lib/db/resource";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const bodySchema = z.object({
  resourceId: z.string().uuid(),
  planText: z.string().min(1),
  init: z.boolean().optional(),
  messages: z.array(messageSchema),
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

  const systemPrompt = [
    "你是学习教练，负责基于学习计划与用户对话。",
    "保持回答简洁、可执行，并与计划一致。",
    `素材标题：${resource.title}`,
    "学习计划（Markdown）：",
    parsed.data.planText,
  ].join("\n");

  const baseMessages: ModelMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  const historyMessages: ModelMessage[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const kickoffMessage: ModelMessage | null = parsed.data.init
    ? {
        role: "user",
        content: "请作为学习教练发送第一条开场消息，引导用户开始学习。",
      }
    : null;

  const { text } = await generateText({
    model: "google/gemini-2.0-flash",
    messages: [
      ...baseMessages,
      ...historyMessages,
      ...(kickoffMessage ? [kickoffMessage] : []),
    ],
  });

  return Response.json({
    ok: true,
    message: { role: "assistant", content: text },
  });
}
