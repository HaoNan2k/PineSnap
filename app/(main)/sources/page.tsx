import { LoginCard } from "@/components/auth/login-card";
import { SourceList } from "@/components/sources/source-list";
import { requireEnv } from "@/lib/env";
import { createContext } from "@/server/context";

export default async function SourcesPage() {
  const ctx = await createContext();
  const { user } = ctx;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoginCard
          supabaseUrl={requireEnv("NEXT_PUBLIC_SUPABASE_URL")}
          supabaseAnonKey={requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")}
          redirectTo="/sources"
        />
      </div>
    );
  }

  return <SourceList />;
}
