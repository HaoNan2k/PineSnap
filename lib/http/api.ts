import { getAuthenticatedUserId } from "@/lib/supabase/auth";

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export type RequireUserIdResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function requireUserId(): Promise<RequireUserIdResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, response: jsonError(401, "Unauthorized") };
  return { ok: true, userId };
}


