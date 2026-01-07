import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";
import {
  CaptureTokenScope,
  createCaptureToken,
  listCaptureTokens,
} from "@/lib/db/capture-token";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tokens = await listCaptureTokens(userId);
  return Response.json({ tokens });
}

export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const bodyJson: unknown = await req.json();
  const scopeSchema = z.custom<CaptureTokenScope>(
    (v) => typeof v === "string" && /^capture:[a-z0-9._-]+$/i.test(v)
  );
  const bodySchema = z.object({
    label: z.string().min(1).max(100).optional(),
    scopes: z.array(scopeSchema).min(1),
  });

  const parsed = bodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, record } = await createCaptureToken({
    userId,
    label: parsed.data.label,
    scopes: parsed.data.scopes,
  });

  // Token is returned ONCE. Client should show-and-copy then discard.
  return Response.json({ token, record }, { status: 201 });
}

