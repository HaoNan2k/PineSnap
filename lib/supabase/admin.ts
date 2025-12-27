import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireServerEnv } from "@/lib/supabase/server";

export function createSupabaseAdminClient(): SupabaseClient {
  const url = requireServerEnv("SUPABASE_URL");
  const serviceRoleKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}


