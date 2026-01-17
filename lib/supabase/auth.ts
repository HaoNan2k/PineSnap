import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) return null;
  return data.user.id;
}

export function getUserIdFromRequest(request: Request): string | null {
  const headerValue = request.headers.get("x-ps-user-id");
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getAuthenticatedUserIdFromRequest(
  request: Request
): Promise<string | null> {
  // Priority 1: Trusted Header from Middleware
  const headerUserId = getUserIdFromRequest(request);
  if (headerUserId) return headerUserId;
  
  // Priority 2: Fallback to Supabase Auth (e.g. for SSR or non-protected routes)
  return getAuthenticatedUserId();
}


