import { ChatArea } from "@/components/chat/components/chat-area";
import { LoginCard } from "@/components/auth/login-card";
import { getAuthenticatedUserId } from "@/lib/supabase/auth";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export default async function Page() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return (
      <LoginCard
        supabaseUrl={requireEnv("SUPABASE_URL")}
        supabaseAnonKey={requireEnv("SUPABASE_ANON_KEY")}
      />
    );
  }

  const conversationId = crypto.randomUUID();
  return <ChatArea conversationId={conversationId} title="新对话" initialMessages={[]} />;
}
