import { ChatArea } from "@/components/chat/components/chat-area";
import { LoginCard } from "@/components/auth/login-card";
import { createContext } from "@/server/context";
import { requireEnv } from "@/lib/env";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const ctx = await createContext();
  const { user } = ctx;
  const params = await searchParams;
  const isUnauthorized = params.unauthorized === "true";
  const returnUrl = typeof params.returnUrl === "string" ? params.returnUrl : "/chat";

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        {isUnauthorized && (
          <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 shadow-sm max-w-md w-full text-center">
            会话已过期，请重新登录
          </div>
        )}
        <LoginCard
          supabaseUrl={requireEnv("SUPABASE_URL")}
          supabaseAnonKey={requireEnv("SUPABASE_ANON_KEY")}
          redirectTo={returnUrl}
        />
      </div>
    );
  }

  const conversationId = crypto.randomUUID();
  return <ChatArea conversationId={conversationId} title="新对话" initialMessages={[]} />;
}
