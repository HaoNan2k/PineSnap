import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
