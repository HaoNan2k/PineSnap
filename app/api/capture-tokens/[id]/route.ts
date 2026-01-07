import { revokeCaptureToken } from "@/lib/db/capture-token";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await revokeCaptureToken({ userId, tokenId: id });
  if (!result.ok) {
    return Response.json({ error: "Not found" }, { status: result.status });
  }

  return Response.json({ ok: true });
}

