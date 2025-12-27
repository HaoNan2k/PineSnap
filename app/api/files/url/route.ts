import { fileStorage } from "@/lib/storage";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

function getTtlSeconds(): number {
  const raw = Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS ?? "300");
  if (!Number.isFinite(raw) || raw <= 0) return 300;
  return raw;
}

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  if (!ref) {
    return Response.json({ error: "Missing ref" }, { status: 400 });
  }

  // Ownership enforcement via object key prefix: users/<userId>/...
  if (!ref.startsWith(`users/${userId}/`)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const ttlSeconds = getTtlSeconds();
  const url = await fileStorage.resolveUrl(ref);
  return Response.json({
    ref,
    url,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}


