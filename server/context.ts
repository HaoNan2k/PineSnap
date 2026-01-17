import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserIdFromRequest } from "@/lib/supabase/auth";
import { headers } from "next/headers";

export async function createContext(opts?: { req?: Request }) {
  const start = Date.now();
  
  // Try to get userId from headers (optimized path via Middleware)
  let user: { id: string } | null = null;
  const headerUserId = opts?.req 
    ? getUserIdFromRequest(opts.req) 
    : (await headers()).get("x-ps-user-id");

  if (headerUserId) {
    user = { id: headerUserId };
  }

  const supabase = await createSupabaseServerClient();
  const afterClient = Date.now();
  
  // Only call getUser() if header is missing (fallback)
  if (!user) {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }
  
  const afterAuth = Date.now();
  console.info("[perf] createContext", {
    headerAuth: !!headerUserId,
    createClientMs: afterClient - start,
    getUserMs: afterAuth - afterClient,
    totalMs: afterAuth - start,
  });

  return {
    supabase,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
