import { LoginCard } from "@/components/auth/login-card";
import { LearnFocus } from "@/components/learn/learn-focus";
import { requireEnv } from "@/lib/env";
import { createContext } from "@/server/context";
import { getResourceWithAccessCheck } from "@/lib/db/resource";
import { notFound, redirect } from "next/navigation";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const ctx = await createContext();
  const { user } = ctx;

  const { resourceId } = await params;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <LoginCard
          supabaseUrl={requireEnv("NEXT_PUBLIC_SUPABASE_URL")}
          supabaseAnonKey={requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")}
          redirectTo={`/learn/${resourceId}`}
        />
      </div>
    );
  }

  const result = await getResourceWithAccessCheck(resourceId, user.id);

  if (!result.ok) {
    if (result.status === 404) notFound();
    // Default to redirecting to inbox if forbidden
    redirect("/sources");
  }

  return <LearnFocus resource={result.resource} />;
}
